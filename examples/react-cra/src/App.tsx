import * as React from 'react';
import {useEffect, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {FlowCirclesLayer, FlowLinesLayer} from '@flowmap.gl/layers';
import {
  Flow,
  getViewStateForLocations,
  Location,
  LocationFilterMode,
  prepareLayersData,
} from '@flowmap.gl/data';
import {StaticMap, ViewportProps} from 'react-map-gl';
import fetchData from './fetchData';

const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v10';
const INITIAL_VIEW_STATE = {
  width: 0,
  height: 0,
  latitude: 0,
  longitude: 0,
  zoom: 1,
  pitch: 0,
  bearing: 0,
};
const INITIAL_FLOW_MAP_STATE = {
  viewport: INITIAL_VIEW_STATE,
  adjustViewportToLocations: true,
  filterState: {
    selectedLocations: undefined,
    locationFilterMode: LocationFilterMode.ALL,
    selectedTimeRange: undefined,
  },
  settingsState: {
    locationTotalsEnabled: true,
    baseMapEnabled: true,
    adaptiveScalesEnabled: true,
    animationEnabled: false,
    clusteringEnabled: true,
    manualClusterZoom: undefined,
    fadeEnabled: true,
    clusteringAuto: true,
    darkMode: true,
    fadeAmount: 50,
    baseMapOpacity: 50,
    colorSchemeKey: 'Teal',
  },
};

function App() {
  const [viewState, setViewState] = useState<ViewportProps>(INITIAL_VIEW_STATE);
  const [data, setData] = useState<{locations: Location[]; flows: Flow[]}>();
  const [layersData, setLayersData] = useState();
  useEffect(() => {
    (async () => {
      const {locations, flows} = await fetchData();
      setData({
        locations,
        flows,
      });
      // eslint-disable-next-line no-undef
      const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
      const viewState = getViewStateForLocations(
        locations,
        (loc) => [loc.lon, loc.lat],
        [width, height],
        {pad: 0.3},
      );
      setViewState({
        ...viewState,
        width,
        height,
      });
    })();
  }, []);

  useEffect(() => {
    if (data) {
      setLayersData(
        // @ts-ignore
        prepareLayersData(
          {
            ...INITIAL_FLOW_MAP_STATE,
            // @ts-ignore
            viewport: viewState,
          },
          data,
        ),
      );
    }
  }, [data, viewState]);

  const layers = [];

  if (layersData) {
    const {circleAttributes, lineAttributes} = layersData;
    layers.push(
      new FlowLinesLayer({
        id: 'lines',
        data: lineAttributes,
        opacity: 1,
        pickable: true,
        drawOutline: true,
        outlineColor: [0, 0, 0, 255],
      }),
    );
    layers.push(
      new FlowCirclesLayer({
        id: 'circles',
        data: circleAttributes,
        opacity: 1,
        pickable: true,
        emptyColor: [0, 0, 0, 255],
        emptyOutlineColor: [0, 0, 0, 255],
      }),
    );
  }
  return (
    <DeckGL
      width="100%"
      height="100%"
      initialViewState={INITIAL_VIEW_STATE}
      viewState={viewState}
      onViewStateChange={({viewState}: any) => {
        setViewState(viewState);
      }}
      controller={true}
      layers={layers}
      style={{mixBlendMode: 'screen'}}
    >
      <StaticMap
        mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={MAPBOX_STYLE_DARK}
      />
    </DeckGL>
  );
}

export default App;
