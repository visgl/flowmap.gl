export interface FlowLocation {
  id: string;
  lon: number;
  lat: number;
  name: string;
}

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

export interface Flow {
  origin: string;
  dest: string;
  count: number;
  time?: Date;
  color?: string;
}

export type FlowMapData = {
  locations: FlowLocation[] | undefined;
  flows: Flow[] | undefined;
};

export interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  altitude?: number;
}

// https://deck.gl/#/documentation/developer-guide/using-layers?section=accessors
export interface AccessorObjectInfo {
  index: number;
  data: any;
  target: any;
}

export type FlowAccessor<T> = (
  flow: Flow,
  objectInfo?: AccessorObjectInfo,
) => T;
export type LocationAccessor<T> = (location: FlowLocation) => T;

export interface FlowAccessors {
  getFlowOriginId: FlowAccessor<string>;
  getFlowDestId: FlowAccessor<string>;
  getFlowMagnitude: FlowAccessor<number>;
  getFlowColor?: FlowAccessor<string | undefined>;
  getAnimatedFlowLineStaggering?: FlowAccessor<string | undefined>;
}

export interface LocationAccessors {
  getLocationId: LocationAccessor<string>;
  getLocationCentroid: LocationAccessor<[number, number]>;
  getLocationTotalIn?: LocationAccessor<number>;
  getLocationTotalOut?: LocationAccessor<number>;
  getLocationTotalWithin?: LocationAccessor<number>;
}

export const getFlowTime = (flow: Flow): Date | undefined => flow.time;
export const getFlowMagnitude = (flow: Flow): number => +flow.count || 0;
export const getFlowOriginId = (flow: Flow): string => flow.origin;
export const getFlowDestId = (flow: Flow): string => flow.dest;
export const getLocationId = (loc: FlowLocation | ClusterNode): string =>
  loc.id;

export function isLocationClusterNode(
  l: FlowLocation | ClusterNode,
): l is ClusterNode {
  const {zoom} = l as ClusterNode;
  return zoom !== undefined;
}

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

export interface Cluster extends ClusterNode {
  name?: string;
  children: string[];
}

export function isCluster(c: ClusterNode): c is Cluster {
  const {children} = c as Cluster;
  return children && children.length > 0;
}

export interface AggregateFlow {
  origin: string;
  dest: string;
  count: number;
  aggregate: true;
}

export function isAggregateFlow(flow: Flow): flow is AggregateFlow {
  const {origin, dest, count, aggregate} = flow as AggregateFlow;
  return (
    origin !== undefined &&
    dest !== undefined &&
    count !== undefined &&
    (aggregate ? true : false)
  );
}

export interface FlowCountsMapReduce<T = any> {
  map: (flow: Flow) => T;
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
