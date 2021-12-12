import * as React from 'react';
import {useEffect, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {FlowMapLayer} from '@flowmap.gl/layers';
import {Flow, getViewStateForLocations, FlowLocation} from '@flowmap.gl/data';
import {StaticMap, ViewportProps} from 'react-map-gl';
import fetchData from './fetchData';
import useUI from './useUI';
import {UI_CONFIG, UI_INITIAL} from './ui-config';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v10';
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v10';

function App() {
  const config = useUI(UI_INITIAL, UI_CONFIG);
  const [viewState, setViewState] = useState<ViewportProps>();
  const [data, setData] =
    useState<{locations: FlowLocation[]; flows: Flow[]}>();

  useEffect(() => {
    (async () => {
      const {locations, flows} = await fetchData();
      setData({locations, flows});
      const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
      const viewState = getViewStateForLocations(
        locations,
        (loc) => [loc.lon, loc.lat],
        [width, height],
        {pad: 0.3},
      );
      setViewState({...viewState, width, height});
    })();
  }, []);

  const layers = [];
  if (data) {
    layers.push(
      new FlowMapLayer({
        id: 'my-flowmap-layer',
        data,
        pickable: true,
        darkMode: config.darkMode,
        colorScheme: config.colorScheme,
        fadeAmount: config.fadeAmount,
        fadeEnabled: config.fadeEnabled,
        locationTotalsEnabled: config.locationTotalsEnabled,
        animationEnabled: config.animationEnabled,
        clusteringEnabled: config.clusteringEnabled,
        clusteringAuto: config.clusteringAuto,
        clusteringLevel: config.clusteringLevel,
        adaptiveScalesEnabled: config.adaptiveScalesEnabled,
      }),
    );
  }
  if (!viewState) {
    return null;
  }
  return (
    <DeckGL
      width="100%"
      height="100%"
      viewState={viewState}
      onViewStateChange={({viewState}: any) => setViewState(viewState)}
      controller={true}
      layers={layers}
      style={{mixBlendMode: config.darkMode ? 'screen' : 'darken'}}
    >
      <StaticMap
        mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
        mapStyle={config.darkMode ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT}
      />
    </DeckGL>
  );
}

export default App;
