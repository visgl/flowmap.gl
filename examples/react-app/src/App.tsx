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
const LEGEND_CIRCLE_RADIUS = 10;
const LEGEND_CIRCLE_SECONDARY_RADIUS = 7;

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
  const [scaleLockEnabled, setScaleLockEnabled] = useState(() =>
    Boolean(config.scaleLockEnabled),
  );
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
        scaleLock: {enabled: scaleLockEnabled},
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
      {(scaleLegend?.flowThickness || scaleLegend?.locationCircles) && (
        <ScaleLegend>
          <ScaleLegend.FlowThickness legend={scaleLegend} />
          <ScaleLegend.CircleSize legend={scaleLegend} />
          <ScaleLockButton
            locked={scaleLockEnabled}
            onToggle={() => setScaleLockEnabled((locked) => !locked)}
          />
        </ScaleLegend>
      )}
    </div>
  );
}

function ScaleLegendRoot({children}: {children: ReactNode}) {
  return <div className="scale-legend">{children}</div>;
}

function ScaleLockButton({
  locked,
  onToggle,
}: {
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className="scale-legend-lock-button"
      type="button"
      aria-pressed={locked}
      onClick={onToggle}
    >
      <span className="scale-legend-lock-icon" aria-hidden="true" />
      <span>{locked ? 'Unlock scales' : 'Lock scales'}</span>
    </button>
  );
}

function FlowThicknessLegend({legend}: {legend: ScaleLegendModel | undefined}) {
  const flowThickness = legend?.flowThickness;
  if (!flowThickness) return null;
  return (
    <div className="scale-legend-section scale-legend-flow-section">
      <div className="scale-legend-title">
        Flow thickness {legend?.locked ? '(locked)' : ''}
      </div>
      {flowThickness.samples.map((sample) => (
        <div className="scale-legend-row" key={sample.label}>
          <span
            className="scale-legend-line"
            style={{
              backgroundColor: rgbaToCss(sample.color),
              height: `${Math.max(2, sample.thickness)}px`,
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
              height: `${Math.max(2, flowThickness.outOfScale.thickness)}px`,
            }}
          />
          <span>{flowThickness.outOfScale.magnitudeLabel}</span>
        </div>
      )}
    </div>
  );
}

function CircleSizeLegend({legend}: {legend: ScaleLegendModel | undefined}) {
  const locationCircles = legend?.locationCircles;
  if (!locationCircles) return null;
  return (
    <div className="scale-legend-section scale-legend-circle-section">
      <div className="scale-legend-title">
        Circle size {legend?.locked ? '(locked)' : ''}
      </div>
      <CircleLegendExample
        label="Incoming > outgoing"
        innerRadius={LEGEND_CIRCLE_RADIUS}
        outerRadius={LEGEND_CIRCLE_SECONDARY_RADIUS}
        colors={locationCircles.colors}
      />
      <CircleLegendExample
        label="Outgoing > incoming"
        innerRadius={LEGEND_CIRCLE_SECONDARY_RADIUS}
        outerRadius={LEGEND_CIRCLE_RADIUS}
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
              width: `${LEGEND_CIRCLE_RADIUS * 2}px`,
              height: `${LEGEND_CIRCLE_RADIUS * 2}px`,
            }}
          />
          <span>{locationCircles.outOfScale.magnitudeLabel}</span>
        </div>
      )}
    </div>
  );
}

const ScaleLegend = Object.assign(ScaleLegendRoot, {
  FlowThickness: FlowThicknessLegend,
  CircleSize: CircleSizeLegend,
});

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
  const incomingDominant = innerRadius > outerRadius;
  return (
    <div className="scale-legend-row">
      <span
        className={`scale-legend-circle-example ${
          incomingDominant ? 'scale-legend-circle-example-incoming' : ''
        }`}
        style={{width: size, height: size}}
      >
        <span
          className="scale-legend-circle-outer"
          style={{
            width: outgoingDominant ? outerSize : innerSize,
            height: outgoingDominant ? outerSize : innerSize,
            backgroundColor: rgbaToCss(
              outgoingDominant ? colors.outgoing : colors.incoming,
            ),
            borderColor: outgoingDominant
              ? rgbaToCss(mixRgba(colors.incoming, colors.outgoing, 0.4))
              : rgbaToCss(colors.incoming),
          }}
        />
        {incomingDominant ? (
          <span
            className="scale-legend-circle-ring"
            style={{
              width: outerSize,
              height: outerSize,
              borderColor: rgbaToCss(colors.outgoing),
            }}
          />
        ) : (
          <span
            className="scale-legend-circle-inner"
            style={{
              width: innerSize,
              height: innerSize,
              backgroundColor: rgbaToCss(colors.incoming),
            }}
          />
        )}
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
