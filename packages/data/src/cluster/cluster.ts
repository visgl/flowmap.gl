/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {min, rollup} from 'd3-array';
import KDBush from 'kdbush';
import {LocationWeightGetter} from './ClusterIndex';
import {Cluster, ClusterLevel, ClusterNode, LocationAccessors} from '../types';

/**
 * The code in this file is a based on https://github.com/mapbox/supercluster
 *
 *  ISC License
 *
 *  Copyright (c) 2016, Mapbox
 *
 *  Permission to use, copy, modify, and/or distribute this software for any purpose
 *  with or without fee is hereby granted, provided that the above copyright notice
 *  and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
 *  FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
 *  OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
 *  TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
 *  THIS SOFTWARE.
 */

export interface Options {
  minZoom: number; // min zoom to generate clusters on
  maxZoom: number; // max zoom level to cluster the points on
  radius: number; // cluster radius in pixels
  extent: number; // tile extent (radius is calculated relative to it)
  nodeSize: number; // size of the KD-tree leaf node, affects performance
  makeClusterName: (id: number, numPoints: number) => string | undefined;
  makeClusterId: (id: number) => string;
}

const defaultOptions: Options = {
  minZoom: 0,
  maxZoom: 16,
  radius: 40,
  extent: 512,
  nodeSize: 64,
  makeClusterName: (id: number, numPoints: number) => undefined,
  makeClusterId: (id: number) => `{[${id}]}`,
};

interface BasePoint {
  x: number; // projected point coordinates
  y: number;
  weight: number;
  zoom: number; // the last zoom the point was processed at
  parentId: number; // parent cluster id
}

interface LeafPoint<L> extends BasePoint {
  index: number; // index of the source feature in the original input array,
  location: L;
}

interface ClusterPoint extends BasePoint {
  id: number;
  numPoints: number;
}

type Point<L> = LeafPoint<L> | ClusterPoint;

export function isLeafPoint<L>(p: Point<L>): p is LeafPoint<L> {
  const {index} = p as LeafPoint<L>;
  return index != null;
}

export function isClusterPoint<L>(p: Point<L>): p is ClusterPoint {
  const {id} = p as ClusterPoint;
  return id != null;
}

type ZoomLevelKDBush = any;

export function clusterLocations<L>(
  locations: Iterable<L>,
  locationAccessors: LocationAccessors<L>,
  getLocationWeight: LocationWeightGetter,
  options?: Partial<Options>,
): ClusterLevel[] {
  const {getLocationLon, getLocationLat, getLocationId} = locationAccessors;
  const opts = {
    ...defaultOptions,
    ...options,
  };
  const {minZoom, maxZoom, nodeSize, makeClusterName, makeClusterId} = opts;

  const trees = new Array<ZoomLevelKDBush>(maxZoom + 1);

  // generate a cluster object for each point and index input points into a KD-tree
  let clusters = new Array<Point<L>>();
  let locationsCount = 0;
  for (const location of locations) {
    const x = getLocationLon(location);
    const y = getLocationLat(location);
    clusters.push({
      x: lngX(x), // projected point coordinates
      y: latY(y),
      weight: getLocationWeight(getLocationId(location)),
      zoom: Infinity, // the last zoom the point was processed at
      index: locationsCount, // index of the source feature in the original input array,
      parentId: -1, // parent cluster id
      location,
    });
    locationsCount++;
  }

  // cluster points on max zoom, then cluster the results on previous zoom, etc.;
  // results in a cluster hierarchy across zoom levels
  trees[maxZoom + 1] = new KDBush(clusters, getX, getY, nodeSize, Float32Array);
  let prevZoom = maxZoom + 1;

  for (let z = maxZoom; z >= minZoom; z--) {
    // create a new set of clusters for the zoom and index them with a KD-tree
    const _clusters = cluster(clusters, z, trees[prevZoom], opts);
    if (_clusters.length === clusters.length) {
      // same number of clusters => move the higher level clusters up
      // no need to keep the same data on multiple levels
      trees[z] = trees[prevZoom];
      trees[prevZoom] = undefined;
      prevZoom = z;
      clusters = _clusters;
    } else {
      prevZoom = z;
      clusters = _clusters;
      trees[z] = new KDBush(clusters, getX, getY, nodeSize, Float32Array);
    }
  }

  if (trees.length === 0) {
    return [];
  }

  const numbersOfClusters = trees.map((d) => d?.points.length);
  const minClusters = min(numbersOfClusters.filter((d) => d > 0));

  const maxClusters = getMaxNumberOfClusters(locations, locationAccessors);

  let maxAvailZoom = numbersOfClusters.indexOf(maxClusters);
  if (maxClusters < locationsCount) {
    maxAvailZoom++;
    if (maxAvailZoom < maxZoom + 1) {
      // move the higher level clusters up to avoid gap between zoom levels
      trees[maxAvailZoom] = trees[maxZoom + 1];
      trees[maxZoom + 1] = undefined;
    }
  }

  const minAvailZoom = Math.min(
    maxAvailZoom,
    numbersOfClusters.lastIndexOf(minClusters),
  );

  const clusterLevels = new Array<ClusterLevel>();
  prevZoom = NaN;
  for (let zoom = maxAvailZoom; zoom >= minAvailZoom; zoom--) {
    let childrenByParent: Map<number, (string | number)[]> | undefined;
    const tree = trees[zoom];
    if (!tree) continue;
    if (zoom < maxAvailZoom) {
      childrenByParent = rollup<Point<L>, (string | number)[], number>(
        trees[prevZoom].points,
        (points: any[]) =>
          points.map((p: any) =>
            p.id ? makeClusterId(p.id) : getLocationId(p.location),
          ),
        (point: any) => point.parentId,
      );
    }

    const nodes: ClusterNode[] = [];
    for (const point of tree.points) {
      const {x, y, numPoints, location} = point;
      if (isLeafPoint(point)) {
        nodes.push({
          id: getLocationId(location),
          zoom,
          lat: getLocationLat(location),
          lon: getLocationLon(location),
        });
      } else if (isClusterPoint(point)) {
        const {id} = point;
        const children = childrenByParent && childrenByParent.get(id);
        if (!children) {
          // Might happen if there are multiple locations with same coordinates
          console.warn(`Omitting cluster with no children, point:`, point);
          continue;
        }
        const cluster = {
          id: makeClusterId(id),
          name: makeClusterName(id, numPoints),
          zoom,
          lat: yLat(y),
          lon: xLng(x),
          children: children ?? [],
        } as Cluster;
        nodes.push(cluster);
      }
    }
    clusterLevels.push({
      zoom,
      nodes,
    });
    prevZoom = zoom;
  }
  return clusterLevels;
}

function createCluster(
  x: number,
  y: number,
  id: number,
  numPoints: number,
  weight: number,
): ClusterPoint {
  return {
    x, // weighted cluster center
    y,
    zoom: Infinity, // the last zoom the cluster was processed at
    id, // encodes index of the first child of the cluster and its zoom level
    parentId: -1, // parent cluster id
    numPoints,
    weight,
  };
}

function cluster<L>(
  points: Point<L>[],
  zoom: number,
  tree: ZoomLevelKDBush,
  options: Options,
) {
  const clusters: Point<L>[] = [];
  const {radius, extent} = options;
  const r = radius / (extent * Math.pow(2, zoom));

  // loop through each point
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // if we've already visited the point at this zoom level, skip it
    if (p.zoom <= zoom) {
      continue;
    }
    p.zoom = zoom;

    // find all nearby points
    const neighborIds = tree.within(p.x, p.y, r);

    let weight = p.weight || 1;
    let numPoints = isClusterPoint(p) ? p.numPoints : 1;
    let wx = p.x * weight;
    let wy = p.y * weight;

    // encode both zoom and point index on which the cluster originated
    const id = (i << 5) + (zoom + 1);

    for (const neighborId of neighborIds) {
      const b = tree.points[neighborId];
      // filter out neighbors that are already processed
      if (b.zoom <= zoom) {
        continue;
      }
      b.zoom = zoom; // save the zoom (so it doesn't get processed twice)

      const weight2 = b.weight || 1;
      const numPoints2 = b.numPoints || 1;
      wx += b.x * weight2; // accumulate coordinates for calculating weighted center
      wy += b.y * weight2;

      weight += weight2;
      numPoints += numPoints2;
      b.parentId = id;
    }

    if (numPoints === 1) {
      clusters.push(p);
    } else {
      p.parentId = id;
      clusters.push(
        createCluster(wx / weight, wy / weight, id, numPoints, weight),
      );
    }
  }

  return clusters;
}

// spherical mercator to longitude/latitude
function xLng(x: number) {
  return (x - 0.5) * 360;
}

function yLat(y: number) {
  const y2 = ((180 - y * 360) * Math.PI) / 180;
  return (360 * Math.atan(Math.exp(y2))) / Math.PI - 90;
}

// longitude/latitude to spherical mercator in [0..1] range
function lngX(lng: number) {
  return lng / 360 + 0.5;
}

function latY(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI;
  return y < 0 ? 0 : y > 1 ? 1 : y;
}

function getX<L>(p: Point<L>) {
  return p.x;
}

function getY<L>(p: Point<L>) {
  return p.y;
}

/**
 * Finds groups of locations which share the same positions.
 * They will always be clustered together at any zoom level
 * which can lead to having too many zooms.
 */
function getMaxNumberOfClusters<L>(
  locations: Iterable<L>,
  locationAccessors: LocationAccessors<L>,
) {
  const {getLocationLon, getLocationLat} = locationAccessors;
  const countByLatLon = new Map<string, number>();
  let numLocations = 0;
  for (const loc of locations) {
    const lon = getLocationLon(loc);
    const lat = getLocationLat(loc);
    const key = `${lon},${lat}`;
    const prev = countByLatLon.get(key);
    countByLatLon.set(key, prev ? prev + 1 : 1);
    numLocations++;
  }

  let numSame = 0;
  for (const [key, count] of countByLatLon) {
    if (count > 1) {
      numSame += count - 1;
    }
  }
  return numLocations - numSame;
}
