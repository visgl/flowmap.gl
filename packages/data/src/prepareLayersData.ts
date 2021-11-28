import {alea} from 'seedrandom';
import {Flow, getFlowMagnitude, getLocationId} from './types';
import {extent} from 'd3-array';
import {getFlowColorScale, isDiffColorsRGBA} from './colors';
import {
  FlowMapSelectorProps,
  getFlowMapColorsRGBA,
  getFlowsForFlowMapLayer,
  getFlowThicknessScale,
  getInCircleSizeGetter,
  getLocationsForFlowMapLayer,
  getLocationIdsInViewport,
  getLocationsForFlowMapLayerById,
  getOutCircleSizeGetter,
  getLocationCentroid,
} from './selectors';
import {FlowMapState} from './FlowMapState';

function flatMap<S, T>(xs: S[], f: (item: S) => T | T[]): T[] {
  return xs.reduce((acc: T[], x: S) => acc.concat(f(x)), []);
}

export type LayersDataAttrValues<T> = {value: T; size: number};

export interface FlowCirclesLayerAttributes {
  length: number;
  attributes: {
    getPosition: LayersDataAttrValues<Float32Array>;
    getColor: LayersDataAttrValues<Uint8Array>;
    getInRadius: LayersDataAttrValues<Float32Array>;
    getOutRadius: LayersDataAttrValues<Float32Array>;
  };
}

export interface FlowLinesLayerAttributes {
  length: number;
  attributes: {
    getSourcePosition: LayersDataAttrValues<Float32Array>;
    getTargetPosition: LayersDataAttrValues<Float32Array>;
    getThickness: LayersDataAttrValues<Float32Array>;
    getColor: LayersDataAttrValues<Uint8Array>;
    getEndpointOffsets: LayersDataAttrValues<Float32Array>;
    getStaggering?: LayersDataAttrValues<Float32Array>;
  };
}

export interface LayersData {
  circleAttributes: FlowCirclesLayerAttributes;
  lineAttributes: FlowLinesLayerAttributes;
}

export default function prepareLayersData(
  state: FlowMapState,
  props: FlowMapSelectorProps,
) {
  const locations = getLocationsForFlowMapLayer(state, props) || [];
  const flows = getFlowsForFlowMapLayer(state, props) || [];

  const flowMapColors = getFlowMapColorsRGBA(state, props);
  const {settingsState} = state;

  const locationsById = getLocationsForFlowMapLayerById(state, props);
  const getCentroid = (id: string) => {
    const loc = locationsById?.get(id);
    return loc ? getLocationCentroid(loc) : [0, 0];
  };

  const locationIdsInViewport = getLocationIdsInViewport(state, props);
  const getInCircleSize = getInCircleSizeGetter(state, props);
  const getOutCircleSize = getOutCircleSizeGetter(state, props);

  const flowThicknessScale = getFlowThicknessScale(state, props);

  const flowMagnitudeExtent = extent(flows, (f) => getFlowMagnitude(f)) as [
    number,
    number,
  ];
  const flowColorScale = getFlowColorScale(
    flowMapColors,
    flowMagnitudeExtent,
    false,
  );

  const circlePositions = new Float32Array(
    flatMap(locations, getLocationCentroid),
  );

  // TODO: diff mode
  const circleColor = isDiffColorsRGBA(flowMapColors)
    ? flowMapColors.positive.locationCircles.inner
    : flowMapColors.locationCircles.inner;

  const circleColors = new Uint8Array(flatMap(locations, (d) => circleColor));
  const inCircleRadii = new Float32Array(
    locations.map((loc) =>
      locationIdsInViewport?.has(loc.id)
        ? getInCircleSize(getLocationId(loc))
        : 1.0,
    ),
  );
  const outCircleRadii = new Float32Array(
    locations.map((loc) =>
      locationIdsInViewport?.has(loc.id)
        ? getOutCircleSize(getLocationId(loc))
        : 1.0,
    ),
  );

  const sourcePositions = new Float32Array(
    flatMap(flows, (d: Flow) => getCentroid(d.origin)),
  );
  const targetPositions = new Float32Array(
    flatMap(flows, (d: Flow) => getCentroid(d.dest)),
  );
  const thicknesses = new Float32Array(
    flows.map((d: Flow) =>
      flowThicknessScale ? flowThicknessScale(d.count) || 0 : 0,
    ),
  );
  const endpointOffsets = new Float32Array(
    flatMap(flows, (d: Flow) => [
      Math.max(getInCircleSize(d.origin), getOutCircleSize(d.origin)),
      Math.max(getInCircleSize(d.dest), getOutCircleSize(d.dest)),
    ]),
  );
  const flowLineColors = new Uint8Array(
    flatMap(flows, (f: Flow) => flowColorScale(getFlowMagnitude(f))),
  );

  const staggeringValues = settingsState.animationEnabled
    ? new Float32Array(
        flows.map((f: Flow) =>
          // @ts-ignore
          new alea(`${f.origin}-${f.dest}`)(),
        ),
      )
    : undefined;

  return {
    circleAttributes: {
      length: locations.length,
      attributes: {
        getPosition: {value: circlePositions, size: 2},
        getColor: {value: circleColors, size: 4},
        getInRadius: {value: inCircleRadii, size: 1},
        getOutRadius: {value: outCircleRadii, size: 1},
      },
    },
    lineAttributes: {
      length: flows.length,
      attributes: {
        getSourcePosition: {value: sourcePositions, size: 2},
        getTargetPosition: {value: targetPositions, size: 2},
        getThickness: {value: thicknesses, size: 1},
        getColor: {value: flowLineColors, size: 4},
        getEndpointOffsets: {value: endpointOffsets, size: 2},
        ...(staggeringValues
          ? {getStaggering: {value: staggeringValues, size: 1}}
          : {}),
      },
    },
  };
}

/**
 * This is used to augment hover picking info so that we can displace location tooltip
 * @param circleAttributes
 * @param index
 */
export function getOuterCircleRadiusByIndex(
  circleAttributes: FlowCirclesLayerAttributes,
  index: number,
) {
  const {getInRadius, getOutRadius} = circleAttributes.attributes;
  return Math.max(getInRadius.value[index], getOutRadius.value[index]);
}

export function getFlowLineAttributesByIndex(
  lineAttributes: FlowLinesLayerAttributes,
  index: number,
): FlowLinesLayerAttributes {
  const {
    getColor,
    getEndpointOffsets,
    getSourcePosition,
    getTargetPosition,
    getThickness,
    getStaggering,
  } = lineAttributes.attributes;
  return {
    length: 1,
    attributes: {
      getColor: {
        value: getColor.value.subarray(index * 4, (index + 1) * 4),
        size: 4,
      },
      getEndpointOffsets: {
        value: getEndpointOffsets.value.subarray(index * 2, (index + 1) * 2),
        size: 2,
      },
      getSourcePosition: {
        value: getSourcePosition.value.subarray(index * 2, (index + 1) * 2),
        size: 2,
      },
      getTargetPosition: {
        value: getTargetPosition.value.subarray(index * 2, (index + 1) * 2),
        size: 2,
      },
      getThickness: {
        value: getThickness.value.subarray(index, index + 1),
        size: 1,
      },
      ...(getStaggering
        ? {
            getStaggering: {
              value: getStaggering.value.subarray(index, index + 1),
              size: 1,
            },
          }
        : undefined),
    },
  };
}
