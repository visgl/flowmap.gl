import * as React from 'react';
import {useEffect, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {FlowMapLayer} from '@flowmap.gl/layers';
import {Flow, getViewStateForLocations, Location} from '@flowmap.gl/data';
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

function App() {
  const [viewState, setViewState] = useState<ViewportProps>(INITIAL_VIEW_STATE);
  const [data, setData] = useState<{locations: Location[]; flows: Flow[]}>();
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

  const layers = [];
  if (data) {
    layers.push(
      new FlowMapLayer({
        locations: data.locations,
        flows: data.flows,
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
