import {BoundingBox, viewport} from '@mapbox/geo-viewport';
import {geoBounds} from 'd3-geo';
import type {
  FeatureCollection,
  GeometryCollection,
  GeometryObject,
} from 'geojson';
import type {ViewportProps, ViewState} from './types';

export type LocationProperties = any;

export type GetViewStateOptions = {
  pad?: number;
  tileSize?: number;
  minZoom?: number;
  maxZoom?: number;
};

export function getViewStateForFeatures(
  featureCollection:
    | FeatureCollection<GeometryObject, LocationProperties>
    | GeometryCollection,
  size: [number, number],
  opts?: GetViewStateOptions,
): ViewState & {width: number; height: number} {
  const {pad = 0.05, tileSize = 512, minZoom = 0, maxZoom = 100} = opts || {};
  const [[x1, y1], [x2, y2]] = geoBounds(featureCollection as any);
  const bounds: BoundingBox = [
    x1 - pad * (x2 - x1),
    y1 - pad * (y2 - y1),
    x2 + pad * (x2 - x1),
    y2 + pad * (y2 - y1),
  ];
  const [width, height] = size;
  const {
    center: [longitude, latitude],
    zoom,
  } = viewport(bounds, size, undefined, undefined, tileSize, true);

  return {
    width,
    height,
    longitude,
    latitude,
    zoom: Math.max(Math.min(maxZoom, zoom), minZoom),
    bearing: 0,
    pitch: 0,
  };
}

export function getViewStateForLocations(
  locations: any[],
  getLocationCentroid: (location: any) => [number, number],
  size: [number, number],
  opts?: GetViewStateOptions,
): ViewState & {width: number; height: number} {
  return getViewStateForFeatures(
    {
      type: 'GeometryCollection',
      geometries: locations.map((location) => ({
        type: 'Point',
        coordinates: getLocationCentroid(location),
      })),
    } as any,
    size,
    opts,
  );
}
