import * as React from 'react';
import {ReactNode, useEffect, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {
  FlowLayerPickingInfo,
  FlowMapLayer,
  PickingType,
} from '@flowmap.gl/layers';
import {getViewStateForLocations} from '@flowmap.gl/data';
import {StaticMap, ViewportProps} from 'react-map-gl';
import fetchData from './fetchData';
import useUI from './useUI';
import {UI_CONFIG, UI_INITIAL} from './ui-config';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v11';
const MAPBOX_STYLE_DARK = MAPBOX_STYLE_LIGHT;

type LocationDatum = {
  id: string;
  name: string;
  lon: number;
  lat: number;
};
type FlowDatum = {
  origin: string;
  dest: string;
  count: number;
};
type LoadedData = {
  locations: LocationDatum[];
  flows: FlowDatum[];
};
type TooltipState = {
  position: {left: number; top: number};
  content: ReactNode;
};

function App() {
  const config = useUI(UI_INITIAL, UI_CONFIG);
  const [viewState, setViewState] = useState<ViewportProps>();
  const [data, setData] = useState<LoadedData>();
  const [tooltip, setTooltip] = useState<TooltipState>();
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
  const handleViewStateChange = ({viewState}: any) => {
    setViewState(viewState);
    setTooltip(undefined);
  };
  const layers = [];
  if (data) {
    layers.push(
      new FlowMapLayer<LocationDatum, FlowDatum>({
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
        getLocationId: (loc) => loc.id,
        getLocationCentroid: (loc) => [loc.lon, loc.lat],
        getFlowOriginId: (flow) => flow.origin,
        getFlowDestId: (flow) => flow.dest,
        getFlowMagnitude: (flow) => flow.count,
        getLocationName: (loc) => loc.name,
        onHover: (info) => setTooltip(getTooltipState(info)),
        onClick: (info) => console.log('clicked', info.type, info.object),
      }),
    );
  }
  if (!viewState) {
    return null;
  }
  return (
    <div
      className={`flowmap-container ${config.darkMode ? 'dark' : 'light'}`}
      style={{position: 'relative'}}
    >
      <DeckGL
        width="100%"
        height="100%"
        viewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        style={{mixBlendMode: config.darkMode ? 'screen' : 'darken'}}
      >
        <StaticMap
          mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={config.darkMode ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT}
        />
      </DeckGL>
      {tooltip && (
        <div className="tooltip" style={tooltip.position}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

function getTooltipState(
  info: FlowLayerPickingInfo<LocationDatum, FlowDatum> | undefined,
): TooltipState | undefined {
  if (!info) return undefined;
  const {x, y, type} = info;
  const position = {left: x, top: y};
  switch (type) {
    case PickingType.LOCATION:
      return {
        position,
        content: (
          <>
            <div>{info.name}</div>
            <div>Incoming trips: {info.totals.incomingCount}</div>
            <div>Outgoing trips: {info.totals.outgoingCount}</div>
            <div>Internal or round trips: {info.totals.internalCount}</div>
          </>
        ),
      };
    case PickingType.FLOW:
      return {
        position,
        content: (
          <>
            <div>
              {info.origin.id} → {info.dest.id}
            </div>
            <div>{info.count}</div>
          </>
        ),
      };
  }
  return undefined;
}

export default App;
