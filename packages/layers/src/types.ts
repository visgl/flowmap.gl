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
  object: T | undefined;
  x: number;
  y: number;
  coordinate: [number, number];
}

export interface LocationPickingInfo<L> extends PickingInfo<L | ClusterNode> {
  type: PickingType.LOCATION;
  id: string;
  name: string;
  totals: LocationTotals;
  circleRadius: number;
  event: MouseEvent | undefined;
}

export interface FlowPickingInfo<L, F> extends PickingInfo<F | AggregateFlow> {
  type: PickingType.FLOW;
  origin: L | ClusterNode;
  dest: L | ClusterNode;
  count: number;
}

// export interface LocationAreaPickingInfo extends PickingInfo<PickingInfoData> {
//   type: PickingType.LOCATION_AREA;
//   object: FlowLocation;
// }

export type FlowLayerPickingInfo<L, F> =
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
