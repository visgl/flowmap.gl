export interface LocationTotals {
  incoming: number;
  outgoing: number;
  within: number;
}

export interface LocationsTotals {
  incoming: {[id: string]: number};
  outgoing: {[id: string]: number};
  within: {[id: string]: number};
}

// export interface FlowLocation {
//   id: string;
//   lon: number;
//   lat: number;
//   name: string;
// }

// export interface Flow {
//   origin: string;
//   dest: string;
//   count: number;
//   time?: Date;
//   color?: string;
// }

export type FlowMapData<L, F> = {
  locations: L[] | undefined;
  flows: F[] | undefined;
};

export interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  altitude?: number;
}

export type FlowAccessor<F, T> = (flow: F) => T; // objectInfo?: AccessorObjectInfo,
export type LocationAccessor<L, T> = (location: L) => T;

export interface FlowAccessors<F> {
  getFlowOriginId: FlowAccessor<F, string>;
  getFlowDestId: FlowAccessor<F, string>;
  getFlowMagnitude: FlowAccessor<F, number>;
  getFlowTime: FlowAccessor<F, Date>; // TODO: use number instead of Date
  // getFlowColor?: FlowAccessor<string | undefined>;
  // getAnimatedFlowLineStaggering?: FlowAccessor<string | undefined>;
}

export interface LocationAccessors<L> {
  getLocationId: LocationAccessor<L, string>;
  getLocationName: LocationAccessor<L, string>;
  getLocationCentroid: LocationAccessor<L, [number, number]>;
  // getLocationTotalIn?: LocationAccessor<number>;
  // getLocationTotalOut?: LocationAccessor<number>;
  // getLocationTotalWithin?: LocationAccessor<number>;
}

// export const getFlowTime = (flow: Flow): Date | undefined => flow.time;
// export const getFlowMagnitude = (flow: Flow): number => +flow.count || 0;
// export const getFlowOriginId = (flow: Flow): string => flow.origin;
// export const getFlowDestId = (flow: Flow): string => flow.dest;
// export const getLocationId = (loc: FlowLocation | ClusterNode): string =>
//   loc.id;

export type FlowMapDataAccessors<L, F> = LocationAccessors<L> &
  FlowAccessors<F>;

export interface CountByTime {
  time: Date;
  count: number;
}

export interface ViewportProps {
  width: number;
  height: number;
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
  pitch: number;
  altitude?: number;
  maxZoom?: number;
  minZoom?: number;
  maxPitch?: number;
  minPitch?: number;
  transitionDuration?: number | 'auto';
  transitionInterpolator?: any;
  transitionInterruption?: any;
  transitionEasing?: any;
}

export interface ClusterNode {
  id: string;
  zoom: number;
  centroid: [number, number];
}

export interface ClusterLevel {
  zoom: number;
  nodes: ClusterNode[];
}

export type ClusterLevels = ClusterLevel[];

// non-leaf cluster node
export interface Cluster extends ClusterNode {
  name?: string;
  children: string[];
}

export function isCluster(c: ClusterNode): c is Cluster {
  const {children} = c as Cluster;
  return children && children.length > 0;
}

export function isLocationClusterNode<L>(l: L | ClusterNode): l is ClusterNode {
  const {zoom} = l as ClusterNode;
  return zoom !== undefined;
}

export interface AggregateFlow {
  origin: string;
  dest: string;
  count: number;
  aggregate: true;
}

export function isAggregateFlow(
  flow: Record<string, any>,
): flow is AggregateFlow {
  return (
    flow &&
    flow.origin !== undefined &&
    flow.dest !== undefined &&
    flow.count !== undefined &&
    (flow.aggregate ? true : false)
  );
}

export interface FlowCountsMapReduce<F, T = any> {
  map: (flow: F) => T;
  reduce: (accumulated: T, val: T) => T;
}

export enum LocationFilterMode {
  ALL = 'ALL',
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
  BETWEEN = 'BETWEEN',
}

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

export type LayersDataAttrValues<T> = {value: T; size: number};
