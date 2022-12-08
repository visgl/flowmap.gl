/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AggregateFlow,
  Cluster,
  ClusterLevels,
  ClusterNode,
  FlowAccessors,
  FlowCountsMapReduce,
  isCluster,
} from './../types';
import {ascending, bisectLeft, extent} from 'd3-array';

export type LocationWeightGetter = (id: string | number) => number;

/**
 * A data structure representing the cluster levels for efficient flow aggregation.
 */
export interface ClusterIndex<F> {
  availableZoomLevels: number[];
  getClusterById: (clusterId: string | number) => Cluster | undefined;
  /**
   * List the nodes on the given zoom level.
   */
  getClusterNodesFor: (zoom: number | undefined) => ClusterNode[] | undefined;
  /**
   * Get the min zoom level on which the location is not clustered.
   */
  getMinZoomForLocation: (locationId: string | number) => number;
  /**
   * List the IDs of all locations in the cluster (leaves of the subtree starting in the cluster).
   */
  expandCluster: (cluster: Cluster, targetZoom?: number) => string[];
  /**
   * Find the cluster the given location is residing in on the specified zoom level.
   */
  findClusterFor: (
    locationId: string | number,
    zoom: number,
  ) => string | number | undefined;
  /**
   * Aggregate flows for the specified zoom level.
   */
  aggregateFlows: (
    flows: F[],
    zoom: number,
    {getFlowOriginId, getFlowDestId, getFlowMagnitude}: FlowAccessors<F>,
    options?: {
      flowCountsMapReduce?: FlowCountsMapReduce<F>;
    },
  ) => (F | AggregateFlow)[];
}

/**
 * Build ClusterIndex from the given cluster hierarchy
 */
export function buildIndex<F>(clusterLevels: ClusterLevels): ClusterIndex<F> {
  const nodesByZoom = new Map<number, ClusterNode[]>();
  const clustersById = new Map<string | number, Cluster>();
  const minZoomByLocationId = new Map<string | number, number>();
  for (const {zoom, nodes} of clusterLevels) {
    nodesByZoom.set(zoom, nodes);
    for (const node of nodes) {
      if (isCluster(node)) {
        clustersById.set(node.id, node);
      } else {
        const {id} = node;
        const mz = minZoomByLocationId.get(id);
        if (mz == null || mz > zoom) {
          minZoomByLocationId.set(id, zoom);
        }
      }
    }
  }

  const [minZoom, maxZoom] = extent(clusterLevels, (cl) => cl.zoom);
  if (minZoom == null || maxZoom == null) {
    throw new Error('Could not determine minZoom or maxZoom');
  }

  const leavesToClustersByZoom = new Map<
    number,
    Map<string | number, Cluster>
  >();

  for (const cluster of clustersById.values()) {
    const {zoom} = cluster;
    let leavesToClusters = leavesToClustersByZoom.get(zoom);
    if (!leavesToClusters) {
      leavesToClusters = new Map<string, Cluster>();
      leavesToClustersByZoom.set(zoom, leavesToClusters);
    }
    visitClusterLeaves(cluster, (leafId) => {
      leavesToClusters?.set(leafId, cluster);
    });
  }

  function visitClusterLeaves(cluster: Cluster, visit: (id: string) => void) {
    for (const childId of cluster.children) {
      const child = clustersById.get(childId);
      if (child) {
        visitClusterLeaves(child, visit);
      } else {
        visit(childId);
      }
    }
  }

  const expandCluster = (cluster: Cluster, targetZoom: number = maxZoom) => {
    const ids: string[] = [];
    const visit = (c: Cluster, expandedIds: (string | number)[]) => {
      if (targetZoom > c.zoom) {
        for (const childId of c.children) {
          const child = clustersById.get(childId);
          if (child) {
            visit(child, expandedIds);
          } else {
            expandedIds.push(childId);
          }
        }
      } else {
        expandedIds.push(c.id);
      }
    };
    visit(cluster, ids);
    return ids;
  };

  function findClusterFor(locationId: string | number, zoom: number) {
    const leavesToClusters = leavesToClustersByZoom.get(zoom);
    if (!leavesToClusters) {
      return undefined;
    }
    const cluster = leavesToClusters.get(locationId);
    return cluster ? cluster.id : undefined;
  }

  const availableZoomLevels = clusterLevels
    .map((cl) => +cl.zoom)
    .sort((a, b) => ascending(a, b));

  return {
    availableZoomLevels,

    getClusterNodesFor: (zoom) => {
      if (zoom === undefined) {
        return undefined;
      }
      return nodesByZoom.get(zoom);
    },

    getClusterById: (clusterId) => clustersById.get(clusterId),

    getMinZoomForLocation: (locationId) =>
      minZoomByLocationId.get(locationId) || minZoom,

    expandCluster,

    findClusterFor,

    aggregateFlows: (
      flows,
      zoom,
      {getFlowOriginId, getFlowDestId, getFlowMagnitude},
      options = {},
    ) => {
      if (zoom > maxZoom) {
        return flows;
      }
      const result: (F | AggregateFlow)[] = [];
      const aggFlowsByKey = new Map<string, AggregateFlow>();
      const makeKey = (origin: string | number, dest: string | number) =>
        `${origin}:${dest}`;
      const {
        flowCountsMapReduce = {
          map: getFlowMagnitude,
          reduce: (acc: any, count: number) => (acc || 0) + count,
        },
      } = options;
      for (const flow of flows) {
        const origin = getFlowOriginId(flow);
        const dest = getFlowDestId(flow);
        const originCluster = findClusterFor(origin, zoom) || origin;
        const destCluster = findClusterFor(dest, zoom) || dest;
        const key = makeKey(originCluster, destCluster);
        if (originCluster === origin && destCluster === dest) {
          result.push(flow);
        } else {
          let aggregateFlow = aggFlowsByKey.get(key);
          if (!aggregateFlow) {
            aggregateFlow = {
              origin: originCluster,
              dest: destCluster,
              count: flowCountsMapReduce.map(flow),
              aggregate: true,
            };
            result.push(aggregateFlow);
            aggFlowsByKey.set(key, aggregateFlow);
          } else {
            aggregateFlow.count = flowCountsMapReduce.reduce(
              aggregateFlow.count,
              flowCountsMapReduce.map(flow),
            );
          }
        }
      }
      return result;
    },
  };
}

export function makeLocationWeightGetter<F>(
  flows: F[],
  {getFlowOriginId, getFlowDestId, getFlowMagnitude}: FlowAccessors<F>,
): LocationWeightGetter {
  const locationTotals = {
    incoming: new Map<string | number, number>(),
    outgoing: new Map<string | number, number>(),
  };
  for (const flow of flows) {
    const origin = getFlowOriginId(flow);
    const dest = getFlowDestId(flow);
    const count = getFlowMagnitude(flow);
    locationTotals.incoming.set(
      dest,
      (locationTotals.incoming.get(dest) || 0) + count,
    );
    locationTotals.outgoing.set(
      origin,
      (locationTotals.outgoing.get(origin) || 0) + count,
    );
  }
  return (id: string | number) =>
    Math.max(
      Math.abs(locationTotals.incoming.get(id) || 0),
      Math.abs(locationTotals.outgoing.get(id) || 0),
    );
}

/**
 * @param availableZoomLevels Must be sorted in ascending order
 * @param targetZoom
 */
export function findAppropriateZoomLevel(
  availableZoomLevels: number[],
  targetZoom: number,
) {
  if (!availableZoomLevels.length) {
    throw new Error('No available zoom levels');
  }
  return availableZoomLevels[
    Math.min(
      bisectLeft(availableZoomLevels, Math.floor(targetZoom)),
      availableZoomLevels.length - 1,
    )
  ];
}
