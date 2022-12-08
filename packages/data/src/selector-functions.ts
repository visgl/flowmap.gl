/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {WebMercatorViewport} from '@math.gl/web-mercator';
import {
  ClusterLevel,
  isCluster,
  LocationAccessors,
  ViewportProps,
} from './types';
import {scaleLinear} from 'd3-scale';
import {ClusterIndex, LocationWeightGetter} from './cluster/ClusterIndex';
import {descending} from 'd3-array';

// TODO: use re-reselect

export const getViewportBoundingBox = (
  viewport: ViewportProps,
  maxLocationCircleSize = 0,
): [number, number, number, number] => {
  const pad = maxLocationCircleSize;
  const bounds = new WebMercatorViewport({
    ...viewport,
    width: viewport.width + pad * 2,
    height: viewport.height + pad * 2,
  }).getBounds();
  return [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
};

export const getFlowThicknessScale = (
  magnitudeExtent: [number, number] | undefined,
) => {
  if (!magnitudeExtent) return undefined;
  return scaleLinear()
    .range([0.025, 0.5])
    .domain([
      0,
      // should support diff mode too
      Math.max.apply(
        null,
        magnitudeExtent.map((x: number | undefined) => Math.abs(x || 0)),
      ),
    ]);
};

/**
 * Adding meaningful cluster names.
 * NOTE: this will mutate the nodes in clusterIndex
 */
export function addClusterNames<L, F>(
  clusterIndex: ClusterIndex<F>,
  clusterLevels: ClusterLevel[],
  locationsById: Map<string | number, L>,
  locationAccessors: LocationAccessors<L>,
  getLocationWeight: LocationWeightGetter,
): void {
  const {getLocationId, getLocationName, getLocationClusterName} =
    locationAccessors;
  const getName = (id: string | number) => {
    const loc = locationsById.get(id);
    if (loc) {
      return getLocationName ? getLocationName(loc) : getLocationId(loc) || id;
    }
    return `"${id}"`;
  };
  for (const level of clusterLevels) {
    for (const node of level.nodes) {
      // Here mutating the nodes (adding names)
      if (isCluster(node)) {
        const leaves = clusterIndex.expandCluster(node);

        leaves.sort((a, b) =>
          descending(getLocationWeight(a), getLocationWeight(b)),
        );

        if (getLocationClusterName) {
          node.name = getLocationClusterName(leaves);
        } else {
          const topId = leaves[0];
          const otherId = leaves.length === 2 ? leaves[1] : undefined;
          node.name = `"${getName(topId)}" and ${
            otherId ? `"${getName(otherId)}"` : `${leaves.length - 1} others`
          }`;
        }
      } else {
        (node as any).name = getName(node.id);
      }
    }
  }
}
