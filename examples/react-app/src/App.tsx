/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import DeckGL from '@deck.gl/react';
import {FlowmapData, getViewStateForLocations} from '@flowmap.gl/data';
import {
  fetchData,
  FlowDatum,
  initLilGui,
  LocationDatum,
  UI_INITIAL,
  useUI,
} from '@flowmap.gl/examples-common';
import {
  FlowmapLayer,
  FlowmapLayerPickingInfo,
  PickingType,
} from '@flowmap.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import {ReactNode, useEffect, useState} from 'react';
import {
  Map as ReactMapGl,
  ViewState as ViewportProps,
} from 'react-map-gl/maplibre';

const MAP_STYLE_LIGHT =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const MAP_STYLE_DARK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

type TooltipState = {
  position: {left: number; top: number};
  content: ReactNode;
};

function App() {
  const config = useUI(UI_INITIAL, initLilGui);
  const [viewState, setViewState] = useState<ViewportProps>();
  const [data, setData] = useState<FlowmapData<LocationDatum, FlowDatum>>();
  const [tooltip, setTooltip] = useState<TooltipState>();
  useEffect(() => {
    (async () => {
      setData(await fetchData(config.clusteringMethod));
    })();
  }, [config.clusteringMethod]);

  useEffect(() => {
    if (!viewState && data?.locations) {
      const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
      const viewState = getViewStateForLocations(
        data.locations,
        (loc: LocationDatum) => [loc.lon, loc.lat],
        [width, height],
      );
      setViewState({
        ...viewState,
        latitude: viewState.latitude - 0.02,
        zoom: viewState.zoom + 1,
        // @ts-ignore
        width,
        height,
      });
    }
  }, [data]);
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
        opacity: config.opacity,
        pickable: true,
        darkMode: config.darkMode,
        colorScheme: config.colorScheme,
        fadeAmount: config.fadeAmount,
        fadeEnabled: config.fadeEnabled,
        fadeOpacityEnabled: config.fadeOpacityEnabled,
        locationsEnabled: config.locationsEnabled,
        locationTotalsEnabled: config.locationTotalsEnabled,
        locationLabelsEnabled: config.locationLabelsEnabled,
        flowLinesRenderingMode: config.flowLinesRenderingMode,
        clusteringEnabled: config.clusteringEnabled,
        clusteringAuto: config.clusteringAuto,
        clusteringLevel: config.clusteringLevel,
        adaptiveScalesEnabled: config.adaptiveScalesEnabled,
        highlightColor: config.highlightColor,
        maxTopFlowsDisplayNum: config.maxTopFlowsDisplayNum,
        flowEndpointsInViewportMode: config.flowEndpointsInViewportMode,
        getLocationId: (loc) => loc.id,
        getLocationLat: (loc) => loc.lat,
        getLocationLon: (loc) => loc.lon,
        getFlowOriginId: (flow) => flow.origin,
        getLocationName: (loc) => loc.name,
        getFlowDestId: (flow) => flow.dest,
        getFlowMagnitude: (flow) => flow.count,
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
        // viewState={viewState}
        initialViewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        // @ts-ignore
        layers={layers}
        style={{mixBlendMode: config.darkMode ? 'screen' : 'darken'}}
      >
        <ReactMapGl
          mapStyle={config.darkMode ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
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
