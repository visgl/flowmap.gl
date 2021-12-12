import * as React from 'react';
import {useEffect} from 'react';
import {render} from 'react-dom';
import DeckGL from '@deck.gl/react';
import {FlowCirclesLayer, FlowLinesLayer} from '@flowmap.gl/layers';
import {csv} from 'd3-fetch';
import {LocationFilterMode, prepareLayersData} from '@flowmap.gl/data';
import {StaticMap} from 'react-map-gl';
import {getViewStateForLocations} from '@flowmap.gl/data';

// eslint-disable-next-line no-undef
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v10';
const INITIAL_VIEW_STATE = {
  latitude: 0,
  longitude: 0,
  zoom: 1,
  pitch: 0,
  bearing: 0,
};
const INITIAL_FLOW_MAP_STATE = {
  viewport: INITIAL_VIEW_STATE,
  filterState: {
    selectedLocations: undefined,
    locationFilterMode: LocationFilterMode.ALL,
    selectedTimeRange: undefined,
  },
  settingsState: {
    locationTotalsEnabled: true,
    adaptiveScalesEnabled: true,
    animationEnabled: false,
    clusteringEnabled: true,
    manualClusterZoom: undefined,
    fadeEnabled: true,
    clusteringAuto: true,
    darkMode: true,
    fadeAmount: 50,
    colorSchemeKey: 'Teal',
  },
};

function App() {
  const [viewState, setViewState] = React.useState(INITIAL_VIEW_STATE);
  const [data, setData] = React.useState();
  const [layersData, setLayersData] = React.useState();
  useEffect(async () => {
    const base = 'https://gist.githubusercontent.com/ilyabo/';
    const path = `${base}/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1`;
    const flows = await csv(`${path}/flows.csv`, (row) => ({
      origin: row.origin,
      dest: row.dest,
      count: +row.count,
    }));
    const locations = await csv(`${path}/locations.csv`, (row) => ({
      ...row,
      lat: +row.lat,
      lon: +row.lon,
    }));
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
      width,
      height,
      ...viewState,
    });
  }, []);

  useEffect(() => {
    if (data) {
      setLayersData(
        prepareLayersData(
          {
            ...INITIAL_FLOW_MAP_STATE,
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
        outlineColor: [0, 0, 0],
      }),
    );
    layers.push(
      new FlowCirclesLayer({
        id: 'circles',
        data: circleAttributes,
        opacity: 1,
        pickable: true,
        emptyColor: [0, 0, 0],
        emptyOutlineColor: [0, 0, 0],
      }),
    );
  }
  return (
    <DeckGL
      width="100%"
      height="100%"
      initialViewState={INITIAL_VIEW_STATE}
      viewState={viewState}
      onViewStateChange={({viewState}) => {
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

document.body.style.margin = 0;
render(<App />, document.body.appendChild(document.createElement('div')));
