export interface Location {
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

export interface Flow {
  origin: string;
  dest: string;
  count: number;
  time?: Date;
  color?: string;
}

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
export type LocationAccessor<T> = (location: Location) => T;

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

export const getFlowTime = (flow: Flow) => flow.time;
export const getFlowMagnitude = (flow: Flow) => +flow.count || 0;
export const getFlowOriginId = (flow: Flow) => flow.origin;
export const getFlowDestId = (flow: Flow) => flow.dest;
export const getLocationId = (loc: Location | ClusterNode) => loc.id;

export function isLocationCluster(l: Location | Cluster): l is Cluster {
  const {zoom} = l as Cluster;
  return zoom !== undefined;
}

export function isLocationClusterNode(
  l: Location | ClusterNode,
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
  altitude: number;
  maxZoom: number;
  minZoom: number;
  maxPitch: number;
  minPitch: number;
  transitionDuration?: number | 'auto';
  transitionInterpolator?: any;
  transitionInterruption?: any;
  transitionEasing?: any;
}

export declare type AsyncState<T> =
  | {
      loading: boolean;
      error?: undefined;
      value?: undefined;
    }
  | {
      loading?: false;
      error: Error;
      value?: undefined;
    }
  | {
      loading?: false;
      error?: undefined;
      value: T;
    };

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
