import {geoBounds} from 'd3-geo';
import {fitBounds} from '@math.gl/web-mercator';
import type {
  FeatureCollection,
  GeometryCollection,
  GeometryObject,
} from 'geojson';
import type {ViewState} from './types';

export type LocationProperties = any;

export type GetViewStateOptions = {
  pad?: number; // size ratio
  padding?: {top: number; bottom: number; left: number; right: number};
  tileSize?: number;
  // minZoom?: number;  // not supported by fitBounds
  maxZoom?: number;
};

export function getViewStateForFeatures(
  featureCollection:
    | FeatureCollection<GeometryObject, LocationProperties>
    | GeometryCollection,
  size: [number, number],
  opts?: GetViewStateOptions,
): ViewState & {width: number; height: number} {
  const {pad = 0.05, maxZoom = 100} = opts || {};
  const bounds = geoBounds(featureCollection as any);
  const [[x1, y1], [x2, y2]] = bounds;
  const paddedBounds: [[number, number], [number, number]] = pad
    ? [
        [x1 - pad * (x2 - x1), y1 - pad * (y2 - y1)],
        [x2 + pad * (x2 - x1), y2 + pad * (y2 - y1)],
      ]
    : bounds;
  const [width, height] = size;
  return {
    ...fitBounds({
      width,
      height,
      bounds: paddedBounds,
      padding: opts?.padding,
      // minZoom,
      maxZoom,
    }),
    width,
    height,
  };
}

export function getViewStateForLocations(
  locations: any[],
  getLocationCoords: (location: any) => [number, number],
  size: [number, number],
  opts?: GetViewStateOptions,
): ViewState & {width: number; height: number} {
  return getViewStateForFeatures(
    {
      type: 'GeometryCollection',
      geometries: locations.map((location) => ({
        type: 'Point',
        coordinates: getLocationCoords(location),
      })),
    } as any,
    size,
    opts,
  );
}
