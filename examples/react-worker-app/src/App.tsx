/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {ReactNode, useEffect, useMemo, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {
  FlowmapLayer,
  FlowmapLayerPickingInfo,
  PickingType,
  getFlowmapCanvasStyle,
  getFlowmapCanvasEffects,
} from '@flowmap.gl/layers';
import {FlowmapDataProvider, ViewportProps} from '@flowmap.gl/data';
import {FlowDatum, LocationDatum, createWorkerDataProvider} from './worker';
import {Map as ReactMapGl} from 'react-map-gl/maplibre';
import {initLilGui, UI_INITIAL, useUI} from '@flowmap.gl/examples-common';
import {setWorkerUrl} from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(maplibreWorkerUrl);

const MAP_STYLE_LIGHT =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const MAP_STYLE_DARK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

type TooltipState = {
  position: {left: number; top: number};
  content: ReactNode;
};

const DATA_BASE_URL = 'https://gist.githubusercontent.com/ilyabo/';
const DATA_PATH = `${DATA_BASE_URL}/68d3dba61d86164b940ffe60e9d36931/raw/a72938b5d51b6df9fa7bba9aa1fb7df00cd0f06a`;

async function createDataProvider(
  signal: AbortSignal,
  clusteringMethod: string,
) {
  return await createWorkerDataProvider(
    {
      clusteringMethod,
      flows: {
        url: `${DATA_PATH}/flows.csv`,
        columns: {
          originId: 'origin',
          destId: 'dest',
          count: 'count',
        },
      },
      locations: {
        url: `${DATA_PATH}/locations.csv`,
        columns: {
          id: 'id',
          name: 'name',
          lat: 'lat',
          lon: 'lon',
        },
      },
    },
    signal,
  );
}

function App() {
  const [config] = useUI(UI_INITIAL, initLilGui);
  const [viewState, setViewState] = useState<ViewportProps>();
  const [data, setData] = useState<{
    dataProvider: FlowmapDataProvider<LocationDatum, FlowDatum>;
    clusteringMethod: string;
  }>();
  const [dataError, setDataError] = useState<string>();
  const [tooltip, setTooltip] = useState<TooltipState>();
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setDataError(undefined);
    (async () => {
      const dataProvider = await createDataProvider(
        controller.signal,
        config.clusteringMethod,
      );
      if (controller.signal.aborted) return;
      setData({dataProvider, clusteringMethod: config.clusteringMethod});
      const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
      const viewState = await dataProvider.getViewportForLocations([
        width,
        height,
      ]);
      if (viewState && !controller.signal.aborted) {
        setViewState((previous) => previous ?? viewState);
      }
    })().catch((error) => {
      if (!controller.signal.aborted) setDataError(String(error));
    });
    return () => controller.abort();
  }, [config.clusteringMethod]);
  const effects = useMemo(
    () => getFlowmapCanvasEffects(config),
    [config.blendingMode, config.darkMode],
  );
  const handleViewStateChange = ({viewState}: any) => {
    setViewState(viewState);
    setTooltip(undefined);
  };
  const layers = [];
  if (data) {
    layers.push(
      new FlowmapLayer<LocationDatum, FlowDatum>({
        id: `my-flowmap-layer-${data.clusteringMethod}`,
        dataProvider: data.dataProvider,
        opacity: config.opacity,
        blendingMode: config.blendingMode,
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
        scaleLock: {enabled: config.scaleLockEnabled},
        highlightColor: config.highlightColor,
        maxTopFlowsDisplayNum: config.maxTopFlowsDisplayNum,
        flowEndpointsInViewportMode: config.flowEndpointsInViewportMode,
        flowLineThicknessScale: config.flowLineThicknessScale,
        flowLineCurviness: config.flowLineCurviness,
        onHover: (info) => setTooltip(getTooltipState(info)),
        onClick: (info) =>
          console.log('clicked', info.object?.type, info.object),
      }),
    );
  }
  if (!viewState) {
    return (
      <div role={dataError ? 'alert' : 'status'}>
        {dataError ?? 'Loading data…'}
      </div>
    );
  }
  return (
    <div
      className={`flowmap-container ${config.darkMode ? 'dark' : 'light'}`}
      style={{position: 'relative'}}
    >
      {dataError && <div role="alert">{dataError}</div>}
      <DeckGL
        effects={effects}
        width="100%"
        height="100%"
        // viewState={viewState}
        initialViewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        style={getFlowmapCanvasStyle(config)}
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
            <div>{`${object.origin.id} → ${object.dest.id}`}</div>
            <div>{object.count}</div>
          </>
        ),
      };
  }
  return undefined;
}

export default App;
