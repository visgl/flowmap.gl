/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import DeckGL from '@deck.gl/react';
import {MapView, type GlobeViewState, type Layer} from '@deck.gl/core';
import GlobeMap from './globe/GlobeMap';
import {fetchGlobeData, flightsSourceUrl} from './globe/data';
import {
  getViewStateForLocations,
  type FlowmapData,
  type ScaleState,
} from '@flowmap.gl/data';
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
  FlowmapLegendWidget,
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
const mapView = new MapView({id: 'map'});

type TooltipState = {
  position: {left: number; top: number};
  content: ReactNode;
};

function App({globeExample = false}: {globeExample?: boolean}) {
  const [globe, setGlobe] = useState(globeExample);
  const [globeViewState, setGlobeViewState] = useState<GlobeViewState>({
    longitude: -25,
    latitude: 25,
    zoom: 1.6,
  });
  const [config, setConfigValue] = useUI(UI_INITIAL, initLilGui);
  const [viewState, setViewState] = useState<ViewportProps>();
  const [data, setData] = useState<FlowmapData<LocationDatum, FlowDatum>>();
  const [dataError, setDataError] = useState<string>();
  const [tooltip, setTooltip] = useState<TooltipState>();
  const [scaleState, setScaleState] = useState<ScaleState>();
  useEffect(() => {
    let cancelled = false;
    setDataError(undefined);
    (async () => {
      try {
        const loadedData = await (globeExample
          ? fetchGlobeData(config.clusteringMethod)
          : fetchData(config.clusteringMethod));
        if (!cancelled) setData(loadedData);
      } catch (error) {
        if (!cancelled) {
          setDataError(error instanceof Error ? error.message : String(error));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [config.clusteringMethod, globeExample]);

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
        ...(globeExample ? {longitude: 0, latitude: 20, zoom: 1} : {}),
        // @ts-ignore
        width,
        height,
      });
    }
  }, [data]);
  const handleViewStateChange = ({viewState}: any) => {
    if (globe) setGlobeViewState(viewState);
    else setViewState(viewState);
    setTooltip(undefined);
  };
  const layers: Layer[] = [];
  const widgets = [];
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
      }),
    );
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
  if (!viewState) {
    return (
      <div className="view-controls" role={dataError ? 'alert' : 'status'}>
        {dataError ? `Unable to load data: ${dataError}` : 'Loading data…'}
      </div>
    );
  }
  return (
    <div
      className={`flowmap-container ${config.darkMode ? 'dark' : 'light'} ${globe ? 'globe' : 'flat'}`}
      style={{position: 'relative'}}
    >
      <div className="view-controls">
        <label>
          <input
            type="checkbox"
            checked={globe}
            onChange={(event) => {
              setGlobe(event.target.checked);
              setTooltip(undefined);
              if (!globeExample && event.target.checked) {
                setGlobeViewState({
                  longitude: viewState.longitude,
                  latitude: viewState.latitude,
                  zoom: Math.min(viewState.zoom, 12),
                  maxZoom: 12,
                });
              }
            }}
          />{' '}
          Globe
        </label>
        {globe && <span>Great-circle arrows</span>}
        <a href={globeExample ? './index.html' : './globe.html'}>
          {globeExample ? 'Bike trips example' : 'Global routes example'}
        </a>
        {globeExample && <a href={flightsSourceUrl}>Global flights data</a>}
        {dataError && (
          <span role="alert">Unable to load data: {dataError}</span>
        )}
      </div>
      {globe ? (
        <GlobeMap
          darkMode={config.darkMode}
          initialViewState={globeViewState}
          onMove={handleViewStateChange}
          layers={layers}
          widgets={widgets}
        />
      ) : (
        <DeckGL
          views={mapView}
          width="100%"
          height="100%"
          initialViewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          // @ts-ignore
          layers={layers}
          widgets={widgets}
          style={{
            mixBlendMode: config.darkMode ? 'screen' : 'darken',
          }}
        >
          <ReactMapGl
            mapStyle={config.darkMode ? MAP_STYLE_DARK : MAP_STYLE_LIGHT}
          />
        </DeckGL>
      )}
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
