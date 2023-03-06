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
  aggFunctionVars,
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
    {
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      getFlowAggFunc,
      getFlowAggWeight,
    }: FlowAccessors<F>,
    options?: {
      flowCountsMapReduce?: FlowCountsMapReduce<F, F>;
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
      {
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
        getFlowAggFunc,
        getFlowAggWeight,
      },
      options = {},
    ) => {
      if (zoom > maxZoom) {
        return flows;
      }
      const result: (F | AggregateFlow)[] = [];
      const aggFlowsByKey = new Map<string, AggregateFlow>();
      const aggFlowCountsByKey = new Map<string, aggFunctionVars[]>();
      const makeKey = (origin: string | number, dest: string | number) =>
        `${origin}:${dest}`;
      const {
        flowCountsMapReduce = {
          map: getFlowMagnitude,
          aggweightmap: !getFlowAggWeight ? getFlowMagnitude : getFlowAggWeight,
          reduce: !getFlowAggFunc
            ? (acc: any, count: number) => (acc || 0) + count
            : getFlowAggFunc,
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
            aggFlowCountsByKey.set(key, [
              {
                aggvalue: flowCountsMapReduce.map(flow),
                aggweight: flowCountsMapReduce.aggweightmap(flow),
              },
            ]);
          } else {
            if (!getFlowAggFunc) {
              aggregateFlow.count = flowCountsMapReduce.reduce(
                aggregateFlow.count,
                flowCountsMapReduce.map(flow),
              );
            } else {
              const aggFlowsCounts = aggFlowCountsByKey.get(key);
              if (!aggFlowsCounts) {
                aggFlowCountsByKey.set(key, [
                  {
                    aggvalue: flowCountsMapReduce.map(flow),
                    aggweight: flowCountsMapReduce.aggweightmap(flow),
                  },
                ]);
              } else {
                aggFlowsCounts.push({
                  aggvalue: flowCountsMapReduce.map(flow),
                  aggweight: flowCountsMapReduce.aggweightmap(flow),
                });
              }
            }
          }
        }
      }
      if (getFlowAggFunc !== undefined) {
        for (const [key, aggregateFlow] of aggFlowsByKey.entries()) {
          aggregateFlow.count = flowCountsMapReduce.reduce(
            aggFlowCountsByKey.get(key),
            0,
          );
        }
      }

      return result;
    },
  };
}

export function makeLocationWeightGetter<F>(
  flows: F[],
  {
    getFlowOriginId,
    getFlowDestId,
    getFlowMagnitude,
    getFlowAggFunc,
    getFlowAggWeight,
  }: FlowAccessors<F>,
): LocationWeightGetter {
  const locationTotals = {
    incoming: new Map<string | number, number>(),
    outgoing: new Map<string | number, number>(),
  };
  const flowAggFunc = !getFlowAggFunc
    ? (acc: any, count: number) => (acc || 0) + count
    : getFlowAggFunc;
  if (!getFlowAggFunc) {
    for (const flow of flows) {
      const origin = getFlowOriginId(flow);
      const dest = getFlowDestId(flow);
      const count = getFlowMagnitude(flow);
      locationTotals.incoming.set(
        dest,
        flowAggFunc(locationTotals.incoming.get(dest) || 0, count),
      );
      locationTotals.outgoing.set(
        origin,
        flowAggFunc(locationTotals.outgoing.get(origin) || 0, count),
      );
    }
  } else {
    const flowDestValues = new Map<string, aggFunctionVars[]>();
    const flowOriginValues = new Map<string, aggFunctionVars[]>();
    for (const flow of flows) {
      const origin = getFlowOriginId(flow).toString();
      const dest = getFlowDestId(flow).toString();
      const count = getFlowMagnitude(flow);
      const aggweightmap =
        getFlowAggWeight === undefined
          ? getFlowMagnitude(flow)
          : getFlowAggWeight(flow);

      const destFlowVal = flowDestValues.get(dest);
      if (!destFlowVal) {
        flowDestValues.set(dest, [{aggvalue: count, aggweight: aggweightmap}]);
      } else {
        destFlowVal.push({aggvalue: count, aggweight: aggweightmap});
      }

      const originFlowVal = flowOriginValues.get(origin);
      if (!originFlowVal) {
        flowOriginValues.set(origin, [
          {aggvalue: count, aggweight: aggweightmap},
        ]);
      } else {
        originFlowVal.push({aggvalue: count, aggweight: aggweightmap});
      }
    }
    for (const [dest, values] of flowDestValues.entries()) {
      locationTotals.incoming.set(dest, flowAggFunc(values, 0));
    }
    for (const [origin, values] of flowOriginValues.entries()) {
      locationTotals.outgoing.set(origin, flowAggFunc(values, 0));
    }
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
