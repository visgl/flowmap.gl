/*
 * Copyright 2018 Teralytics
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {FeatureCollection, GeometryObject} from 'geojson';
import {Flow, Location} from '@flowmap.gl/data';

export type LocationProperties = any;

export type Locations =
  | FeatureCollection<GeometryObject, LocationProperties>
  | Location[];

export function isFeatureCollection(
  locations: Locations,
): locations is FeatureCollection<GeometryObject, LocationProperties> {
  return (
    (locations as FeatureCollection<GeometryObject, LocationProperties>)
      .type === 'FeatureCollection'
  );
}

export const enum LocationCircleType {
  INNER = 'inner',
  OUTER = 'outer',
  OUTLINE = 'outline',
}

export interface LocationCircle {
  location: Location;
  type: LocationCircleType;
}

export type PickingInfoData = Flow | Location | LocationCircle;

export enum PickingType {
  LOCATION = 'location',
  FLOW = 'flow',
  LOCATION_AREA = 'location-area',
}

export type DeckGLLayer = any;

export interface PickingInfo<T> {
  layer: DeckGLLayer;
  index: number;
  object: T;
  x: number;
  y: number;
  lngLat: [number, number];
}

export type PickingHandler<T> = (
  info: T,
  event: {srcEvent: MouseEvent},
) => void;

export interface LocationPickingInfo extends PickingInfo<PickingInfoData> {
  type: PickingType.LOCATION;
  object: Location;
  totalIn: number;
  totalOut: number;
  totalWithin: number;
  circleRadius: number;
}

export interface LocationAreaPickingInfo extends PickingInfo<PickingInfoData> {
  type: PickingType.LOCATION_AREA;
  object: Location;
}

export interface FlowPickingInfo extends PickingInfo<PickingInfoData> {
  type: PickingType.FLOW;
  object: Flow;
  origin: Location;
  dest: Location;
}

export type FlowLayerPickingInfo =
  | LocationPickingInfo
  | LocationAreaPickingInfo
  | FlowPickingInfo;

export type LocationCircleAccessor<T> = (locCircle: LocationCircle) => T;

export type NumberScale = (value: number) => number;
