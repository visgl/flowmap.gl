/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import DeckGL from '@deck.gl/react';
import {
  FlowmapData,
  ScaleLegendModel,
  getViewStateForLocations,
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
  const [scaleLegend, setScaleLegend] = useState<ScaleLegendModel>();
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
        flowLineThicknessScale: config.flowLineThicknessScale,
        flowLineCurviness: config.flowLineCurviness,
        scaleLock: {enabled: config.scaleLockEnabled},
        onScaleLegendChange: setScaleLegend,
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
      <ScaleLegend legend={scaleLegend} />
    </div>
  );
}

function ScaleLegend({legend}: {legend: ScaleLegendModel | undefined}) {
  if (!legend?.flowThickness && !legend?.locationCircles) return null;
  const {flowThickness, locationCircles} = legend;
  return (
    <div className="scale-legend">
      {flowThickness && (
        <div className="scale-legend-section">
          <div className="scale-legend-title">
            Flow thickness {legend.locked ? '(locked)' : ''}
          </div>
          {flowThickness.samples.map((sample) => (
            <div className="scale-legend-row" key={sample.label}>
              <span
                className="scale-legend-line"
                style={{
                  backgroundColor: rgbaToCss(sample.color),
                  height: `${Math.max(2, sample.thickness * 24)}px`,
                }}
              />
              <span>{sample.label}</span>
            </div>
          ))}
          {flowThickness.outOfScale && (
            <div className="scale-legend-row">
              <span
                className="scale-legend-line"
                style={{
                  backgroundColor: rgbaToCss(flowThickness.outOfScale.color),
                  height: `${Math.max(
                    2,
                    flowThickness.outOfScale.thickness * 24,
                  )}px`,
                }}
              />
              <span>{flowThickness.outOfScale.magnitudeLabel}</span>
            </div>
          )}
        </div>
      )}
      {locationCircles && (
        <div className="scale-legend-section">
          <div className="scale-legend-title">
            Circle size {legend.locked ? '(locked)' : ''}
          </div>
          <div className="scale-legend-note">
            Inner: {locationCircles.incomingLabel}
          </div>
          <div className="scale-legend-note">
            Outer: {locationCircles.outgoingLabel}
          </div>
          <CircleLegendExample
            label="Incoming > outgoing"
            innerRadius={17}
            outerRadius={12}
            colors={locationCircles.colors}
          />
          <CircleLegendExample
            label="Outgoing > incoming"
            innerRadius={12}
            outerRadius={17}
            colors={locationCircles.colors}
          />
          <div className="scale-legend-note">
            Range: {formatLegendRange(locationCircles.domain)}
          </div>
          {locationCircles.outOfScale && (
            <div className="scale-legend-row">
              <span
                className="scale-legend-circle"
                style={{
                  backgroundColor: rgbaToCss(locationCircles.outOfScale.color),
                  width: `${Math.max(8, locationCircles.outOfScale.radius)}px`,
                  height: `${Math.max(8, locationCircles.outOfScale.radius)}px`,
                }}
              />
              <span>{locationCircles.outOfScale.magnitudeLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CircleLegendExample({
  label,
  innerRadius,
  outerRadius,
  colors,
}: {
  label: string;
  innerRadius: number;
  outerRadius: number;
  colors: NonNullable<ScaleLegendModel['locationCircles']>['colors'];
}) {
  const size = Math.max(innerRadius, outerRadius) * 2;
  const innerSize = innerRadius * 2;
  const outerSize = outerRadius * 2;
  const outgoingDominant = outerRadius > innerRadius;
  const outerColor = outgoingDominant ? colors.outgoing : colors.incoming;
  return (
    <div className="scale-legend-row">
      <span
        className="scale-legend-circle-example"
        style={{width: size, height: size}}
      >
        <span
          className="scale-legend-circle-outer"
          style={{
            width: outerSize,
            height: outerSize,
            backgroundColor: rgbaToCss(outerColor),
            borderColor: outgoingDominant
              ? rgbaToCss(mixRgba(colors.incoming, colors.outgoing, 0.4))
              : rgbaToCss(colors.incoming),
          }}
        />
        <span
          className="scale-legend-circle-inner"
          style={{
            width: innerSize,
            height: innerSize,
            backgroundColor: rgbaToCss(colors.incoming),
          }}
        />
      </span>
      <span>{label}</span>
    </div>
  );
}

function formatLegendRange([min, max]: [number, number]): string {
  return `${formatLegendValue(min)} - ${formatLegendValue(max)}`;
}

function formatLegendValue(value: number): string {
  return value >= 1000
    ? value.toLocaleString(undefined, {maximumFractionDigits: 0})
    : value.toLocaleString(undefined, {maximumFractionDigits: 2});
}

function rgbaToCss([r, g, b, a]: [number, number, number, number]): string {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

function mixRgba(
  from: [number, number, number, number],
  to: [number, number, number, number],
  amount: number,
): [number, number, number, number] {
  return [
    Math.round(from[0] * (1 - amount) + to[0] * amount),
    Math.round(from[1] * (1 - amount) + to[1] * amount),
    Math.round(from[2] * (1 - amount) + to[2] * amount),
    Math.round(from[3] * (1 - amount) + to[3] * amount),
  ];
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
