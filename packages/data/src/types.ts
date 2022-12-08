/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

export type FlowmapData<L, F> = {
  locations: Iterable<L> | undefined;
  flows: Iterable<F> | undefined;
  clusterLevels?: ClusterLevels;
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
  getFlowOriginId: FlowAccessor<F, string | number>;
  getFlowDestId: FlowAccessor<F, string | number>;
  getFlowMagnitude: FlowAccessor<F, number>;
  getFlowTime?: FlowAccessor<F, Date>; // TODO: use number instead of Date
  // getFlowColor?: FlowAccessor<string | undefined>;
}

export interface LocationAccessors<L> {
  getLocationId: LocationAccessor<L, string | number>;
  getLocationName?: LocationAccessor<L, string>;
  getLocationLat: LocationAccessor<L, number>;
  getLocationLon: LocationAccessor<L, number>;
  getLocationClusterName?: (locationIds: (string | number)[]) => string;
  // getLocationTotalIn?: LocationAccessor<number>;
  // getLocationTotalOut?: LocationAccessor<number>;
  // getLocationTotalInternal?: LocationAccessor<number>;
}

export type FlowmapDataAccessors<L, F> = LocationAccessors<L> &
  FlowAccessors<F>;

export interface LocationTotals {
  incomingCount: number;
  outgoingCount: number;
  internalCount: number;
}

// export interface LocationsTotals {
//   incoming: {[id: string]: number};
//   outgoing: {[id: string]: number};
//   internal: {[id: string]: number};
// }

export interface CountByTime {
  time: Date;
  count: number;
}

export interface ViewportProps {
  width: number;
  height: number;
  latitude: number;
  longitude: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
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
  id: string | number;
  zoom: number;
  lat: number;
  lon: number;
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
  origin: string | number;
  dest: string | number;
  count: number;
  aggregate: true;
}

export function isAggregateFlow(
  flow: Record<string, any>,
): flow is AggregateFlow {
  return (
    flow &&
    // flow.origin !== undefined &&
    // flow.dest !== undefined &&
    // flow.count !== undefined &&
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
  locationLabels?: string[];
}

export type LayersDataAttrValues<T> = {value: T; size: number};
