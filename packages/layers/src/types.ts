/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AggregateFlow,
  Cluster,
  ClusterNode,
  LocationTotals,
} from '@flowmap.gl/data';

export type LayerProps = Record<string, unknown>;

export enum PickingType {
  LOCATION = 'location',
  FLOW = 'flow',
  // LOCATION_AREA = 'location-area',
}

export type DeckGLLayer = Record<string, any>;

export interface PickingInfo<T> {
  layer: DeckGLLayer;
  index: number;
  picked: boolean;
  object: T | undefined;
  x: number;
  y: number;
  coordinate: [number, number];
  event: MouseEvent | undefined;
}

export interface LocationPickingInfoObject<L> {
  id: string | number;
  type: PickingType.LOCATION;
  location: L | ClusterNode;
  name: string;
  totals: LocationTotals;
  circleRadius: number;
}

export type LocationPickingInfo<L> = PickingInfo<LocationPickingInfoObject<L>>;

export interface FlowPickingInfoObject<L, F> {
  type: PickingType.FLOW;
  flow: F | AggregateFlow;
  origin: L | ClusterNode;
  dest: L | ClusterNode;
  count: number;
}

export type FlowPickingInfo<L, F> = PickingInfo<FlowPickingInfoObject<L, F>>;

// export interface LocationAreaPickingInfo extends PickingInfo<PickingInfoData> {
//   type: PickingType.LOCATION_AREA;
//   object: FlowLocation;
// }

export type FlowmapLayerPickingInfo<L, F> =
  | LocationPickingInfo<L>
  // | LocationAreaPickingInfo
  | FlowPickingInfo<L, F>;

// import {FeatureCollection, GeometryObject} from 'geojson';
// export type LocationProperties = Record<string, unknown>;

// export type Locations =
//   | FeatureCollection<GeometryObject, LocationProperties>
//   | FlowLocation[];

// export function isFeatureCollection(
//   locations: Locations,
// ): locations is FeatureCollection<GeometryObject, LocationProperties> {
//   return (
//     (locations as FeatureCollection<GeometryObject, LocationProperties>)
//       .type === 'FeatureCollection'
//   );
// }
