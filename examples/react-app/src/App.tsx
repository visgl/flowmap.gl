import * as React from 'react';
import {ReactNode, useEffect, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {
  FlowmapLayerPickingInfo,
  FlowmapLayer,
  PickingType,
} from '@flowmap.gl/layers';
import {getViewStateForLocations} from '@flowmap.gl/data';
import {StaticMap, ViewportProps} from 'react-map-gl';
import {
  fetchData,
  FlowDatum,
  LoadedData,
  LocationDatum,
  initLilGui,
  UI_INITIAL,
  useUI,
} from '@flowmap.gl/examples-common';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v11';
const MAPBOX_STYLE_DARK = MAPBOX_STYLE_LIGHT;

type TooltipState = {
  position: {left: number; top: number};
  content: ReactNode;
};

function App() {
  const config = useUI(UI_INITIAL, initLilGui);
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
        (loc: LocationDatum) => [loc.lon, loc.lat],
        [width, height],
        {
          // this is just for the BIXI dataset to look nicer on load
          padding: {
            top: -height * 0.6,
            left: -width * 0.2,
            bottom: -height * 0.2,
            right: 0,
          },
        },
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
      new FlowmapLayer<LocationDatum, FlowDatum>({
        id: 'my-flowmap-layer',
        data,
        pickable: true,
        darkMode: config.darkMode,
        colorScheme: config.colorScheme,
        fadeAmount: config.fadeAmount,
        fadeEnabled: config.fadeEnabled,
        fadeOpacityEnabled: config.fadeOpacityEnabled,
        locationTotalsEnabled: config.locationTotalsEnabled,
        animationEnabled: config.animationEnabled,
        clusteringEnabled: config.clusteringEnabled,
        clusteringAuto: config.clusteringAuto,
        clusteringLevel: config.clusteringLevel,
        adaptiveScalesEnabled: config.adaptiveScalesEnabled,
        highlightColor: config.highlightColor,
        maxTopFlowsDisplayNum: config.maxTopFlowsDisplayNum,
        getLocationId: (loc) => loc.id,
        getLocationLat: (loc) => loc.lat,
        getLocationLon: (loc) => loc.lon,
        getFlowOriginId: (flow) => flow.origin,
        getFlowDestId: (flow) => flow.dest,
        getFlowMagnitude: (flow) => flow.count,
        getLocationName: (loc) => loc.name,
        onHover: (info) => setTooltip(getTooltipState(info)),
        onClick: (info) =>
          console.log('clicked', info.object?.type, info.object, info),
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
  info: FlowmapLayerPickingInfo<LocationDatum, FlowDatum> | undefined,
): TooltipState | undefined {
  if (!info) return undefined;
  const {x, y, object} = info;
  const position = {left: x, top: y};
  switch (object?.type) {
    case PickingType.LOCATION:
      return {
        position,
        content: (
          <>
            <div>{object.name}</div>
            <div>Incoming trips: {object.totals.incomingCount}</div>
            <div>Outgoing trips: {object.totals.outgoingCount}</div>
            <div>Internal or round trips: {object.totals.internalCount}</div>
          </>
        ),
      };
    case PickingType.FLOW:
      return {
        position,
        content: (
          <>
            <div>
              {object.origin.id} → {object.dest.id}
            </div>
            <div>{object.count}</div>
          </>
        ),
      };
  }
  return undefined;
}

export default App;
