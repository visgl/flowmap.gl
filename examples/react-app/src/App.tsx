/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import type {GlobeViewState, Layer} from '@deck.gl/core';
import FlowmapCanvas from './map/FlowmapCanvas';
import {FLOWMAP_LABELS_ANCHOR} from './map/basemap-style';
import {fetchGlobeData} from './globe/data';
import {initialConfig, initExampleGui} from './ui';
import {
  getViewStateForLocations,
  type FlowmapData,
  type ScaleState,
} from '@flowmap.gl/data';
import {
  fetchData,
  FlowDatum,
  LocationDatum,
  useUI,
} from '@flowmap.gl/examples-common';
import {
  FlowmapLayer,
  type FlowmapLayerProps,
  FlowmapLegendWidget,
  FlowmapLayerPickingInfo,
  PickingType,
} from '@flowmap.gl/layers';
import 'maplibre-gl/dist/maplibre-gl.css';
import {ReactNode, useEffect, useRef, useState} from 'react';
import type {ViewState as ViewportProps} from 'react-map-gl/maplibre';

type TooltipState = {
  position: {left: number; top: number};
  content: ReactNode;
};

function App() {
  const [globeViewState, setGlobeViewState] = useState<GlobeViewState>({
    longitude: -25,
    latitude: 25,
    zoom: 1.6,
  });
  const [config, setConfigValue] = useUI(initialConfig, initExampleGui);
  const globe = config.globe;
  const interleaved = config.canvasRendering !== 'separate';
  const [viewState, setViewState] = useState<ViewportProps>({
    longitude: 0,
    latitude: 20,
    zoom: 1,
    pitch: 0,
    bearing: 0,
    padding: {top: 0, bottom: 0, left: 0, right: 0},
  });
  const [data, setData] = useState<FlowmapData<LocationDatum, FlowDatum>>();
  const previousDataset = useRef('flights');
  const [dataError, setDataError] = useState<string>();
  const [tooltip, setTooltip] = useState<TooltipState>();
  const [scaleState, setScaleState] = useState<ScaleState>();
  useEffect(() => {
    let cancelled = false;
    setDataError(undefined);
    (async () => {
      try {
        const loadedData = await (config.dataset === 'bixi'
          ? fetchData(config.clusteringMethod)
          : fetchGlobeData(config.clusteringMethod));
        if (!cancelled) {
          setData(loadedData);
          if (previousDataset.current !== config.dataset) {
            previousDataset.current = config.dataset;
            if (config.dataset === 'bixi') {
              const camera = getViewStateForLocations(
                loadedData.locations,
                (loc: LocationDatum) => [loc.lon, loc.lat],
                [globalThis.innerWidth, globalThis.innerHeight],
              );
              setViewState((previous) => ({...previous, ...camera}));
              setGlobeViewState(camera);
            } else {
              setGlobeViewState({longitude: -25, latitude: 25, zoom: 1.6});
              setViewState((previous) => ({
                ...previous,
                longitude: 0,
                latitude: 20,
                zoom: 1,
              }));
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.clusteringMethod, config.dataset]);

  useEffect(() => {
    setTooltip(undefined);
  }, [globe]);
  const handleViewStateChange = ({viewState}: any) => {
    if (globe) setGlobeViewState(viewState);
    else setViewState(viewState);
    setTooltip(undefined);
  };
  const layers: Layer[] = [];
  const widgets = [];
  if (data) {
    // Set draw order on the original layer: cloning would wrap its picking handlers twice.
    const layerProps: FlowmapLayerProps<LocationDatum, FlowDatum> & {
      beforeId: string;
    } = {
      beforeId: FLOWMAP_LABELS_ANCHOR,
      id: 'my-flowmap-layer',
      data,
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
      highlightColor: config.highlightColor,
      maxTopFlowsDisplayNum: config.maxTopFlowsDisplayNum,
      flowEndpointsInViewportMode: config.flowEndpointsInViewportMode,
      flowLineThicknessScale: config.flowLineThicknessScale,
      flowLineCurviness: config.flowLineCurviness,
      scaleLock: {enabled: config.scaleLockEnabled},
      onScaleChange: setScaleState,
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
    };
    layers.push(new FlowmapLayer<LocationDatum, FlowDatum>(layerProps));
  }
  if (scaleState?.flowThickness || scaleState?.locationCircles) {
    widgets.push(
      new FlowmapLegendWidget({
        scaleState,
        darkMode: config.darkMode,
        placement: 'bottom-right',
        style: {
          marginRight: '15px',
          marginBottom: '44px',
        },
        sections: ['flowThickness', 'locationCircles'],
        showLockControl: true,
        onToggleLock: (locked) => setConfigValue('scaleLockEnabled', locked),
      }),
    );
  }
  if (!data) {
    return (
      <div className="basemap-status" role={dataError ? 'alert' : 'status'}>
        {dataError ? `Unable to load data: ${dataError}` : 'Loading data…'}
      </div>
    );
  }
  return (
    <div
      className={`flowmap-container ${config.darkMode ? 'dark' : 'light'} ${globe ? 'globe' : 'flat'} ${interleaved ? 'interleaved' : 'separate-canvas'}`}
      style={{position: 'relative'}}
    >
      {dataError && (
        <div className="basemap-status" role="alert">
          Unable to load data: {dataError}
        </div>
      )}
      <FlowmapCanvas
        key={`${globe ? 'globe' : 'flat'}-${interleaved}`}
        projection={globe ? 'globe' : 'mercator'}
        interleaved={interleaved}
        blendingMode={config.blendingMode}
        darkMode={config.darkMode}
        labelsEnabled={config.basemapLabels}
        initialViewState={globe ? globeViewState : viewState}
        onMove={handleViewStateChange}
        layers={layers}
        widgets={widgets}
      />
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
