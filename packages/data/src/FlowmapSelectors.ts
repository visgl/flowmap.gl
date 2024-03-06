/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {ascending, descending, extent, min, rollup} from 'd3-array';
import {ScaleLinear, scaleSqrt} from 'd3-scale';
import KDBush from 'kdbush';
import {
  ParametricSelector,
  createSelector,
  createSelectorCreator,
  defaultMemoize,
} from 'reselect';
import {alea} from 'seedrandom';
import FlowmapAggregateAccessors from './FlowmapAggregateAccessors';
import {FlowmapState} from './FlowmapState';
import {
  ClusterIndex,
  LocationWeightGetter,
  buildIndex,
  findAppropriateZoomLevel,
  makeLocationWeightGetter,
} from './cluster/ClusterIndex';
import {clusterLocations} from './cluster/cluster';
import getColors, {
  ColorsRGBA,
  DiffColorsRGBA,
  getColorsRGBA,
  getDiffColorsRGBA,
  getFlowColorScale,
  isDiffColors,
  isDiffColorsRGBA,
} from './colors';
import {
  addClusterNames,
  getFlowThicknessScale,
  getViewportBoundingBox,
} from './selector-functions';
import {
  TimeGranularityKey,
  getTimeGranularityByKey,
  getTimeGranularityByOrder,
  getTimeGranularityForDate,
} from './time';
import {
  AggregateFlow,
  Cluster,
  ClusterLevels,
  ClusterNode,
  CountByTime,
  FlowAccessors,
  FlowCirclesLayerAttributes,
  FlowLinesLayerAttributes,
  FlowmapData,
  FlowmapDataAccessors,
  LayersData,
  LocationFilterMode,
  LocationTotals,
  isLocationClusterNode,
} from './types';

const MAX_CLUSTER_ZOOM_LEVEL = 20;
type KDBushTree = any;

export type Selector<L, F, T> = ParametricSelector<
  FlowmapState,
  FlowmapData<L, F>,
  T
>;

export default class FlowmapSelectors<
  L extends Record<string, any>,
  F extends Record<string, any>,
> {
  accessors: FlowmapAggregateAccessors<L, F>;

  constructor(accessors: FlowmapDataAccessors<L, F>) {
    this.accessors = new FlowmapAggregateAccessors(accessors);
    this.setAccessors(accessors);
  }

  setAccessors(accessors: FlowmapDataAccessors<L, F>) {
    this.accessors = new FlowmapAggregateAccessors(accessors);
  }

  getAggregateAccessors(): FlowmapAggregateAccessors<L, F> {
    return this.accessors;
  }

  getFlowsFromProps = (state: FlowmapState, props: FlowmapData<L, F>) =>
    props.flows;
  getLocationsFromProps = (state: FlowmapState, props: FlowmapData<L, F>) =>
    props.locations;
  getClusterLevelsFromProps = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ) => {
    return props.clusterLevels;
  };
  getMaxTopFlowsDisplayNum = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.settings.maxTopFlowsDisplayNum;
  getSelectedLocations = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.filter?.selectedLocations;
  getLocationFilterMode = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.filter?.locationFilterMode;
  getClusteringEnabled = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.settings.clusteringEnabled;
  getLocationTotalsEnabled = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.settings.locationTotalsEnabled;
  getLocationLabelsEnabled = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.settings.locationLabelsEnabled;
  getZoom = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.viewport.zoom;
  getViewport = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.viewport;
  getSelectedTimeRange = (state: FlowmapState, props: FlowmapData<L, F>) =>
    state.filter?.selectedTimeRange;

  getColorScheme: Selector<L, F, string | string[] | undefined> = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ) => state.settings.colorScheme;

  getDarkMode: Selector<L, F, boolean> = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ) => state.settings.darkMode;

  getFadeEnabled: Selector<L, F, boolean> = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ) => state.settings.fadeEnabled;

  getFadeOpacityEnabled: Selector<L, F, boolean> = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ) => state.settings.fadeOpacityEnabled;

  getFadeAmount: Selector<L, F, number> = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ) => state.settings.fadeAmount;

  getAnimate: Selector<L, F, boolean> = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ) => state.settings.animationEnabled;

  getInvalidLocationIds: Selector<L, F, (string | number)[] | undefined> =
    createSelector(this.getLocationsFromProps, (locations) => {
      if (!locations) return undefined;
      const invalid = [];
      for (const location of locations) {
        const id = this.accessors.getLocationId(location);
        const lon = this.accessors.getLocationLon(location);
        const lat = this.accessors.getLocationLat(location);
        if (!(-90 <= lat && lat <= 90) || !(-180 <= lon && lon <= 180)) {
          invalid.push(id);
        }
      }
      return invalid.length > 0 ? invalid : undefined;
    });

  getLocations: Selector<L, F, Iterable<L> | undefined> = createSelector(
    this.getLocationsFromProps,
    this.getInvalidLocationIds,
    (locations, invalidIds) => {
      if (!locations) return undefined;
      if (!invalidIds || invalidIds.length === 0) return locations;
      const invalid = new Set(invalidIds);
      const filtered: L[] = [];
      for (const location of locations) {
        const id = this.accessors.getLocationId(location);
        if (!invalid.has(id)) {
          filtered.push(location);
        }
      }
      return filtered;
    },
  );

  getLocationIds: Selector<L, F, Set<string | number> | undefined> =
    createSelector(this.getLocations, (locations) => {
      if (!locations) return undefined;
      const ids = new Set<string | number>();
      for (const id of locations) {
        ids.add(this.accessors.getLocationId(id));
      }
      return ids;
    });

  getSelectedLocationsSet: Selector<L, F, Set<string | number> | undefined> =
    createSelector(this.getSelectedLocations, (ids) =>
      ids && ids.length > 0 ? new Set(ids) : undefined,
    );

  getSortedFlowsForKnownLocations: Selector<L, F, F[] | undefined> =
    createSelector(
      this.getFlowsFromProps,
      this.getLocationIds,
      (flows, ids) => {
        if (!ids || !flows) return undefined;
        const filtered = [];
        for (const flow of flows) {
          const srcId = this.accessors.getFlowOriginId(flow);
          const dstId = this.accessors.getFlowDestId(flow);
          if (ids.has(srcId) && ids.has(dstId)) {
            filtered.push(flow);
          }
        }
        return filtered.sort((a: F, b: F) =>
          descending(
            Math.abs(this.accessors.getFlowMagnitude(a)),
            Math.abs(this.accessors.getFlowMagnitude(b)),
          ),
        );
      },
    );

  getActualTimeExtent: Selector<L, F, [Date, Date] | undefined> =
    createSelector(this.getSortedFlowsForKnownLocations, (flows) => {
      if (!flows) return undefined;
      let start = null;
      let end = null;
      for (const flow of flows) {
        const time = this.accessors.getFlowTime(flow);
        if (time) {
          if (start == null || start > time) start = time;
          if (end == null || end < time) end = time;
        }
      }
      if (!start || !end) return undefined;
      return [start, end];
    });

  getTimeGranularityKey: Selector<L, F, TimeGranularityKey | undefined> =
    createSelector(
      this.getSortedFlowsForKnownLocations,
      this.getActualTimeExtent,
      (flows, timeExtent) => {
        if (!flows || !timeExtent) return undefined;

        const minOrder = min(flows, (d) => {
          const t = this.accessors.getFlowTime(d);
          return t ? getTimeGranularityForDate(t).order : null;
        });
        if (minOrder == null) return undefined;
        const timeGranularity = getTimeGranularityByOrder(minOrder);
        return timeGranularity ? timeGranularity.key : undefined;
      },
    );

  getTimeExtent: Selector<L, F, [Date, Date] | undefined> = createSelector(
    this.getActualTimeExtent,
    this.getTimeGranularityKey,
    (timeExtent, timeGranularityKey) => {
      const timeGranularity = timeGranularityKey
        ? getTimeGranularityByKey(timeGranularityKey)
        : undefined;
      if (!timeExtent || !timeGranularity?.interval) return undefined;
      const {interval} = timeGranularity;
      return [timeExtent[0], interval.offset(interval.floor(timeExtent[1]), 1)];
    },
  );

  getSortedFlowsForKnownLocationsFilteredByTime: Selector<
    L,
    F,
    F[] | undefined
  > = createSelector(
    this.getSortedFlowsForKnownLocations,
    this.getTimeExtent,
    this.getSelectedTimeRange,
    (flows, timeExtent, timeRange) => {
      if (!flows) return undefined;
      if (
        !timeExtent ||
        !timeRange ||
        (timeExtent[0] === timeRange[0] && timeExtent[1] === timeRange[1])
      ) {
        return flows;
      }
      return flows.filter((flow) => {
        const time = this.accessors.getFlowTime(flow);
        return time && timeRange[0] <= time && time < timeRange[1];
      });
    },
  );

  getLocationsHavingFlows: Selector<L, F, Iterable<L> | undefined> =
    createSelector(
      this.getSortedFlowsForKnownLocations,
      this.getLocations,
      (flows, locations) => {
        if (!locations || !flows) return locations;
        const withFlows = new Set();
        for (const flow of flows) {
          withFlows.add(this.accessors.getFlowOriginId(flow));
          withFlows.add(this.accessors.getFlowDestId(flow));
        }
        const filtered = [];
        for (const location of locations) {
          if (withFlows.has(this.accessors.getLocationId(location))) {
            filtered.push(location);
          }
        }
        return filtered;
      },
    );

  getLocationsById: Selector<L, F, Map<string | number, L> | undefined> =
    createSelector(this.getLocationsHavingFlows, (locations) => {
      if (!locations) return undefined;
      const locationsById = new Map<string | number, L>();
      for (const location of locations) {
        locationsById.set(this.accessors.getLocationId(location), location);
      }
      return locationsById;
    });

  getLocationWeightGetter: Selector<L, F, LocationWeightGetter | undefined> =
    createSelector(this.getSortedFlowsForKnownLocations, (flows) => {
      if (!flows) return undefined;
      const getLocationWeight = makeLocationWeightGetter(
        flows,
        this.accessors.getFlowmapDataAccessors(),
      );
      return getLocationWeight;
    });

  getClusterLevels: Selector<L, F, ClusterLevels | undefined> = createSelector(
    this.getClusterLevelsFromProps,
    this.getLocationsHavingFlows,
    this.getLocationWeightGetter,
    (clusterLevelsFromProps, locations, getLocationWeight) => {
      if (clusterLevelsFromProps) return clusterLevelsFromProps;
      if (!locations || !getLocationWeight) return undefined;
      const clusterLevels = clusterLocations(
        locations,
        this.accessors.getFlowmapDataAccessors(),
        getLocationWeight,
        {
          maxZoom: MAX_CLUSTER_ZOOM_LEVEL,
        },
      );
      return clusterLevels;
    },
  );

  getClusterIndex: Selector<L, F, ClusterIndex<F> | undefined> = createSelector(
    this.getLocationsById,
    this.getLocationWeightGetter,
    this.getClusterLevels,
    (locationsById, getLocationWeight, clusterLevels) => {
      if (!locationsById || !getLocationWeight || !clusterLevels)
        return undefined;

      const clusterIndex = buildIndex<F>(clusterLevels);
      // Adding meaningful names
      addClusterNames(
        clusterIndex,
        clusterLevels,
        locationsById,
        this.accessors.getFlowmapDataAccessors(),
        getLocationWeight,
      );
      return clusterIndex;
    },
  );

  getAvailableClusterZoomLevels = createSelector(
    this.getClusterIndex,
    this.getSelectedLocations,
    (clusterIndex, selectedLocations): number[] | undefined => {
      if (!clusterIndex) {
        return undefined;
      }

      let maxZoom = Number.POSITIVE_INFINITY;
      let minZoom = Number.NEGATIVE_INFINITY;

      const adjust = (zoneId: string | number) => {
        const cluster = clusterIndex.getClusterById(zoneId);
        if (cluster) {
          minZoom = Math.max(minZoom, cluster.zoom);
          maxZoom = Math.min(maxZoom, cluster.zoom);
        } else {
          const zoom = clusterIndex.getMinZoomForLocation(zoneId);
          minZoom = Math.max(minZoom, zoom);
        }
      };

      if (selectedLocations) {
        for (const id of selectedLocations) {
          adjust(id);
        }
      }

      return clusterIndex.availableZoomLevels.filter(
        (level) => minZoom <= level && level <= maxZoom,
      );
    },
  );

  _getClusterZoom: Selector<L, F, number | undefined> = createSelector(
    this.getClusterIndex,
    this.getZoom,
    this.getAvailableClusterZoomLevels,
    (clusterIndex, mapZoom, availableClusterZoomLevels) => {
      if (!clusterIndex) return undefined;
      if (!availableClusterZoomLevels || mapZoom == null) {
        return undefined;
      }

      const clusterZoom = findAppropriateZoomLevel(
        availableClusterZoomLevels,
        mapZoom,
      );
      return clusterZoom;
    },
  );

  getClusterZoom = (state: FlowmapState, props: FlowmapData<L, F>) => {
    const {settings} = state;
    if (!settings.clusteringEnabled) return undefined;
    if (settings.clusteringAuto || settings.clusteringLevel == null) {
      return this._getClusterZoom(state, props);
    }
    return settings.clusteringLevel;
  };

  getLocationsForSearchBox: Selector<L, F, (L | Cluster)[] | undefined> =
    createSelector(
      this.getClusteringEnabled,
      this.getLocationsHavingFlows,
      this.getSelectedLocations,
      this.getClusterZoom,
      this.getClusterIndex,
      (
        clusteringEnabled,
        locations,
        selectedLocations,
        clusterZoom,
        clusterIndex,
      ) => {
        if (!locations) return undefined;
        let result: (L | Cluster)[] = Array.from(locations);
        // if (clusteringEnabled) {
        //   if (clusterIndex) {
        //     const zoomItems = clusterIndex.getClusterNodesFor(clusterZoom);
        //     if (zoomItems) {
        //       result = result.concat(zoomItems.filter(isCluster));
        //     }
        //   }
        // }

        if (clusterIndex && selectedLocations) {
          const toAppend = [];
          for (const id of selectedLocations) {
            const cluster = clusterIndex.getClusterById(id);
            if (
              cluster &&
              !result.find(
                (d) =>
                  (isLocationClusterNode(d)
                    ? d.id
                    : this.accessors.getLocationId(d)) === id,
              )
            ) {
              toAppend.push(cluster);
            }
          }
          if (toAppend.length > 0) {
            result = result.concat(toAppend);
          }
        }
        return result;
      },
    );

  getDiffMode: Selector<L, F, boolean> = createSelector(
    this.getFlowsFromProps,
    (flows) => {
      if (flows) {
        for (const f of flows) {
          if (this.accessors.getFlowMagnitude(f) < 0) {
            return true;
          }
        }
      }
      return false;
    },
  );

  _getFlowmapColors = createSelector(
    this.getDiffMode,
    this.getColorScheme,
    this.getDarkMode,
    this.getFadeEnabled,
    this.getFadeOpacityEnabled,
    this.getFadeAmount,
    this.getAnimate,
    getColors,
  );

  getFlowmapColorsRGBA = createSelector(
    this._getFlowmapColors,
    (flowmapColors) => {
      return isDiffColors(flowmapColors)
        ? getDiffColorsRGBA(flowmapColors)
        : getColorsRGBA(flowmapColors);
    },
  );

  getUnknownLocations: Selector<L, F, Set<string | number> | undefined> =
    createSelector(
      this.getLocationIds,
      this.getFlowsFromProps,
      this.getSortedFlowsForKnownLocations,
      (ids, flows, flowsForKnownLocations) => {
        if (!ids || !flows) return undefined;
        if (
          flowsForKnownLocations
          // && flows.length === flowsForKnownLocations.length
        )
          return undefined;
        const missing = new Set<string | number>();
        for (const flow of flows) {
          if (!ids.has(this.accessors.getFlowOriginId(flow)))
            missing.add(this.accessors.getFlowOriginId(flow));
          if (!ids.has(this.accessors.getFlowDestId(flow)))
            missing.add(this.accessors.getFlowDestId(flow));
        }
        return missing;
      },
    );

  getSortedAggregatedFilteredFlows: Selector<
    L,
    F,
    (F | AggregateFlow)[] | undefined
  > = createSelector(
    this.getClusterIndex,
    this.getClusteringEnabled,
    this.getSortedFlowsForKnownLocationsFilteredByTime,
    this.getClusterZoom,
    this.getTimeExtent,
    (clusterTree, isClusteringEnabled, flows, clusterZoom, timeExtent) => {
      if (!flows) return undefined;
      let aggregated: (F | AggregateFlow)[];
      if (isClusteringEnabled && clusterTree && clusterZoom != null) {
        aggregated = clusterTree.aggregateFlows(
          // TODO: aggregate across time
          // timeExtent != null
          //   ? aggregateFlows(flows) // clusterTree.aggregateFlows won't aggregate unclustered across time
          //   : flows,
          flows,
          clusterZoom,
          this.accessors.getFlowmapDataAccessors(),
        );
      } else {
        aggregated = aggregateFlows(
          flows,
          this.accessors.getFlowmapDataAccessors(),
        );
      }
      aggregated.sort((a, b) =>
        descending(
          Math.abs(this.accessors.getFlowMagnitude(a)),
          Math.abs(this.accessors.getFlowMagnitude(b)),
        ),
      );
      return aggregated;
    },
  );

  getExpandedSelectedLocationsSet: Selector<
    L,
    F,
    Set<string | number> | undefined
  > = createSelector(
    this.getClusteringEnabled,
    this.getSelectedLocationsSet,
    this.getClusterIndex,
    (clusteringEnabled, selectedLocations, clusterIndex) => {
      if (!selectedLocations || !clusterIndex) {
        return selectedLocations;
      }

      const result = new Set<string | number>();
      for (const locationId of selectedLocations) {
        const cluster = clusterIndex.getClusterById(locationId);
        if (cluster) {
          const expanded = clusterIndex.expandCluster(cluster);
          for (const id of expanded) {
            result.add(id);
          }
        } else {
          result.add(locationId);
        }
      }
      return result;
    },
  );

  getTotalCountsByTime: Selector<L, F, CountByTime[] | undefined> =
    createSelector(
      this.getSortedFlowsForKnownLocations,
      this.getTimeGranularityKey,
      this.getTimeExtent,
      this.getExpandedSelectedLocationsSet,
      this.getLocationFilterMode,
      (
        flows,
        timeGranularityKey,
        timeExtent,
        selectedLocationSet,
        locationFilterMode,
      ) => {
        const timeGranularity = timeGranularityKey
          ? getTimeGranularityByKey(timeGranularityKey)
          : undefined;
        if (!flows || !timeGranularity || !timeExtent) return undefined;
        const byTime = flows.reduce((m, flow) => {
          if (
            this.isFlowInSelection(
              flow,
              selectedLocationSet,
              locationFilterMode,
            )
          ) {
            const key = timeGranularity
              .interval(this.accessors.getFlowTime(flow))
              .getTime();
            m.set(
              key,
              (m.get(key) ?? 0) + this.accessors.getFlowMagnitude(flow),
            );
          }
          return m;
        }, new Map<number, number>());

        return Array.from(byTime.entries()).map(([millis, count]) => ({
          time: new Date(millis),
          count,
        }));
      },
    );

  getMaxLocationCircleSize: Selector<L, F, number> = createSelector(
    this.getLocationTotalsEnabled,
    (locationTotalsEnabled) => (locationTotalsEnabled ? 17 : 1),
  );

  getViewportBoundingBox: Selector<L, F, [number, number, number, number]> =
    createSelector(
      this.getViewport,
      this.getMaxLocationCircleSize,
      getViewportBoundingBox,
    );

  getLocationsForZoom: Selector<L, F, Iterable<L> | ClusterNode[] | undefined> =
    createSelector(
      this.getClusteringEnabled,
      this.getLocationsHavingFlows,
      this.getClusterIndex,
      this.getClusterZoom,
      (clusteringEnabled, locationsHavingFlows, clusterIndex, clusterZoom) => {
        if (clusteringEnabled && clusterIndex) {
          return clusterIndex.getClusterNodesFor(clusterZoom);
        } else {
          return locationsHavingFlows;
        }
      },
    );

  getLocationTotals: Selector<
    L,
    F,
    Map<string | number, LocationTotals> | undefined
  > = createSelector(
    this.getLocationsForZoom,
    this.getSortedAggregatedFilteredFlows,
    this.getSelectedLocationsSet,
    this.getLocationFilterMode,
    (locations, flows, selectedLocationsSet, locationFilterMode) => {
      if (!flows) return undefined;
      const totals = new Map<string | number, LocationTotals>();
      const add = (
        id: string | number,
        d: Partial<LocationTotals>,
      ): LocationTotals => {
        const rv = totals.get(id) ?? {
          incomingCount: 0,
          outgoingCount: 0,
          internalCount: 0,
        };
        if (d.incomingCount != null) rv.incomingCount += d.incomingCount;
        if (d.outgoingCount != null) rv.outgoingCount += d.outgoingCount;
        if (d.internalCount != null) rv.internalCount += d.internalCount;
        return rv;
      };
      for (const f of flows) {
        if (
          this.isFlowInSelection(f, selectedLocationsSet, locationFilterMode)
        ) {
          const originId = this.accessors.getFlowOriginId(f);
          const destId = this.accessors.getFlowDestId(f);
          const count = this.accessors.getFlowMagnitude(f);
          if (originId === destId) {
            totals.set(originId, add(originId, {internalCount: count}));
          } else {
            totals.set(originId, add(originId, {outgoingCount: count}));
            totals.set(destId, add(destId, {incomingCount: count}));
          }
        }
      }
      return totals;
    },
  );

  getLocationsTree: Selector<L, F, KDBushTree> = createSelector(
    this.getLocationsForZoom,
    (locations) => {
      if (!locations) {
        return undefined;
      }
      const nodes = Array.isArray(locations)
        ? locations
        : Array.from(locations);
      const bush = new KDBush(nodes.length, 64, Float32Array);
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        bush.add(
          lngX(this.accessors.getLocationLon(node)),
          latY(this.accessors.getLocationLat(node)),
        );
      }
      bush.finish();
      bush.points = nodes;
      return bush;
    },
  );

  _getLocationIdsInViewport: Selector<L, F, Set<string> | undefined> =
    createSelector(
      this.getLocationsTree,
      this.getViewportBoundingBox,
      (tree: KDBushTree, bbox: [number, number, number, number]) => {
        const ids = this._getLocationsInBboxIndices(tree, bbox);
        if (ids) {
          return new Set(
            ids.map((idx: number) =>
              this.accessors.getLocationId(tree.points[idx]),
            ) as Array<string>,
          );
        }
        return undefined;
      },
    );

  getLocationIdsInViewport: Selector<L, F, Set<string | number> | undefined> =
    createSelectorCreator(
      defaultMemoize,
      // @ts-ignore
      (
        s1: Set<string> | undefined,
        s2: Set<string> | undefined,
        index: number,
      ) => {
        if (s1 === s2) return true;
        if (s1 == null || s2 == null) return false;
        if (s1.size !== s2.size) return false;
        for (const item of s1) if (!s2.has(item)) return false;
        return true;
      },
    )(
      this._getLocationIdsInViewport,
      (locationIds: Set<string> | undefined) => {
        if (!locationIds) return undefined;
        return locationIds;
      },
    );

  getTotalUnfilteredCount: Selector<L, F, number | undefined> = createSelector(
    this.getSortedFlowsForKnownLocations,
    (flows) => {
      if (!flows) return undefined;
      return flows.reduce(
        (m, flow) => m + this.accessors.getFlowMagnitude(flow),
        0,
      );
    },
  );

  getTotalFilteredCount: Selector<L, F, number | undefined> = createSelector(
    this.getSortedAggregatedFilteredFlows,
    this.getSelectedLocationsSet,
    this.getLocationFilterMode,
    (flows, selectedLocationSet, locationFilterMode) => {
      if (!flows) return undefined;
      const count = flows.reduce((m, flow) => {
        if (
          this.isFlowInSelection(flow, selectedLocationSet, locationFilterMode)
        ) {
          return m + this.accessors.getFlowMagnitude(flow);
        }
        return m;
      }, 0);
      return count;
    },
  );

  _getLocationTotalsExtent: Selector<L, F, [number, number] | undefined> =
    createSelector(this.getLocationTotals, (locationTotals) =>
      calcLocationTotalsExtent(locationTotals, undefined),
    );

  _getLocationTotalsForViewportExtent: Selector<
    L,
    F,
    [number, number] | undefined
  > = createSelector(
    this.getLocationTotals,
    this.getLocationIdsInViewport,
    (locationTotals, locationsInViewport) =>
      calcLocationTotalsExtent(locationTotals, locationsInViewport),
  );

  getLocationTotalsExtent = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ): [number, number] | undefined => {
    if (state.settings.adaptiveScalesEnabled) {
      return this._getLocationTotalsForViewportExtent(state, props);
    } else {
      return this._getLocationTotalsExtent(state, props);
    }
  };

  getFlowsForFlowmapLayer: Selector<L, F, (F | AggregateFlow)[] | undefined> =
    createSelector(
      this.getSortedAggregatedFilteredFlows,
      this.getLocationIdsInViewport,
      this.getSelectedLocationsSet,
      this.getLocationFilterMode,
      this.getMaxTopFlowsDisplayNum,
      (
        flows,
        locationIdsInViewport,
        selectedLocationsSet,
        locationFilterMode,
        maxTopFlowsDisplayNum,
      ) => {
        if (!flows || !locationIdsInViewport) return undefined;
        const picked: (F | AggregateFlow)[] = [];
        let pickedCount = 0;
        for (const flow of flows) {
          const origin = this.accessors.getFlowOriginId(flow);
          const dest = this.accessors.getFlowDestId(flow);
          if (
            locationIdsInViewport.has(origin) ||
            locationIdsInViewport.has(dest)
          ) {
            if (
              this.isFlowInSelection(
                flow,
                selectedLocationsSet,
                locationFilterMode,
              )
            ) {
              if (origin !== dest) {
                // exclude self-loops
                picked.push(flow);
                pickedCount++;
              }
            }
          }
          // Only keep top
          if (pickedCount > maxTopFlowsDisplayNum) break;
        }
        // assuming they are sorted in descending order,
        // we need ascending for rendering
        return picked.reverse();
      },
    );

  _getFlowMagnitudeExtent: Selector<L, F, [number, number] | undefined> =
    createSelector(
      this.getSortedAggregatedFilteredFlows,
      this.getSelectedLocationsSet,
      this.getLocationFilterMode,
      (flows, selectedLocationsSet, locationFilterMode) => {
        if (!flows) return undefined;
        let rv: [number, number] | undefined = undefined;
        for (const f of flows) {
          if (
            this.accessors.getFlowOriginId(f) !==
              this.accessors.getFlowDestId(f) &&
            this.isFlowInSelection(f, selectedLocationsSet, locationFilterMode)
          ) {
            const count = this.accessors.getFlowMagnitude(f);
            if (rv == null) {
              rv = [count, count];
            } else {
              if (count < rv[0]) rv[0] = count;
              if (count > rv[1]) rv[1] = count;
            }
          }
        }
        return rv;
      },
    );

  _getAdaptiveFlowMagnitudeExtent: Selector<
    L,
    F,
    [number, number] | undefined
  > = createSelector(this.getFlowsForFlowmapLayer, (flows) => {
    if (!flows) return undefined;
    const rv = extent(flows, this.accessors.getFlowMagnitude);
    return rv[0] !== undefined && rv[1] !== undefined ? rv : undefined;
  });

  getFlowMagnitudeExtent = (
    state: FlowmapState,
    props: FlowmapData<L, F>,
  ): [number, number] | undefined => {
    if (state.settings.adaptiveScalesEnabled) {
      return this._getAdaptiveFlowMagnitudeExtent(state, props);
    } else {
      return this._getFlowMagnitudeExtent(state, props);
    }
  };

  getLocationMaxAbsTotalGetter = createSelector(
    this.getLocationTotals,
    (locationTotals) => {
      return (locationId: string) => {
        const total = locationTotals?.get(locationId);
        if (!total) return undefined;
        return Math.max(
          Math.abs(total.incomingCount + total.internalCount),
          Math.abs(total.outgoingCount + total.internalCount),
        );
      };
    },
  );

  getFlowThicknessScale = createSelector(
    this.getFlowMagnitudeExtent,
    getFlowThicknessScale,
  );

  getCircleSizeScale = createSelector(
    this.getMaxLocationCircleSize,
    this.getLocationTotalsEnabled,
    this.getLocationTotalsExtent,
    (maxLocationCircleSize, locationTotalsEnabled, locationTotalsExtent) => {
      if (!locationTotalsEnabled) {
        return () => maxLocationCircleSize;
      }
      if (!locationTotalsExtent) return undefined;
      return scaleSqrt()
        .range([0, maxLocationCircleSize])
        .domain([
          0,
          // should support diff mode too
          Math.max.apply(
            null,
            locationTotalsExtent.map((x: number | undefined) =>
              Math.abs(x || 0),
            ),
          ),
        ]);
    },
  );

  getInCircleSizeGetter = createSelector(
    this.getCircleSizeScale,
    this.getLocationTotals,
    (circleSizeScale, locationTotals) => {
      return (locationId: string | number) => {
        const total = locationTotals?.get(locationId);
        if (total && circleSizeScale) {
          return (
            circleSizeScale(
              Math.abs(total.incomingCount + total.internalCount),
            ) || 0
          );
        }
        return 0;
      };
    },
  );

  getOutCircleSizeGetter = createSelector(
    this.getCircleSizeScale,
    this.getLocationTotals,
    (circleSizeScale, locationTotals) => {
      return (locationId: string | number) => {
        const total = locationTotals?.get(locationId);
        if (total && circleSizeScale) {
          return (
            circleSizeScale(
              Math.abs(total.outgoingCount + total.internalCount),
            ) || 0
          );
        }
        return 0;
      };
    },
  );

  getSortedLocationsForZoom: Selector<L, F, L[] | ClusterNode[] | undefined> =
    createSelector(
      this.getLocationsForZoom,
      this.getInCircleSizeGetter,
      this.getOutCircleSizeGetter,
      (locations, getInCircleSize, getOutCircleSize) => {
        if (!locations) return undefined;
        const nextLocations = [...locations] as L[] | ClusterNode[];
        return nextLocations.sort((a, b) => {
          const idA = this.accessors.getLocationId(a);
          const idB = this.accessors.getLocationId(b);
          return ascending(
            Math.max(getInCircleSize(idA), getOutCircleSize(idA)),
            Math.max(getInCircleSize(idB), getOutCircleSize(idB)),
          );
        });
      },
    );

  getLocationsForFlowmapLayer: Selector<
    L,
    F,
    Array<L | ClusterNode> | undefined
  > = createSelector(
    this.getSortedLocationsForZoom,
    // this.getLocationIdsInViewport,
    (
      locations,
      // locationIdsInViewport
    ) => {
      // if (!locations) return undefined;
      // if (!locationIdsInViewport) return locations;
      // if (locationIdsInViewport.size === locations.length) return locations;
      // const filtered = [];
      // for (const loc of locations) {
      //   if (locationIdsInViewport.has(loc.id)) {
      //     filtered.push(loc);
      //   }
      // }
      // return filtered;
      // @ts-ignore
      // return locations.filter(
      //   (loc: L | ClusterNode) => locationIdsInViewport!.has(loc.id)
      // );
      // TODO: return location in viewport + "connected" ones
      return locations;
    },
  );

  getLocationsForFlowmapLayerById: Selector<
    L,
    F,
    Map<string, L | ClusterNode> | undefined
  > = createSelector(this.getLocationsForFlowmapLayer, (locations) => {
    if (!locations) return undefined;
    return locations.reduce(
      (m, d) => (m.set(this.accessors.getLocationId(d), d), m),
      new Map(),
    );
  });

  getLocationOrClusterByIdGetter = createSelector(
    this.getClusterIndex,
    this.getLocationsById,
    (clusterIndex, locationsById) => {
      return (id: string | number) =>
        clusterIndex?.getClusterById(id) ?? locationsById?.get(id);
    },
  );

  getLayersData: Selector<L, F, LayersData> = createSelector(
    this.getLocationsForFlowmapLayer,
    this.getFlowsForFlowmapLayer,
    this.getFlowmapColorsRGBA,
    this.getLocationsForFlowmapLayerById,
    this.getLocationIdsInViewport,
    this.getInCircleSizeGetter,
    this.getOutCircleSizeGetter,
    this.getFlowThicknessScale,
    this.getAnimate,
    this.getLocationLabelsEnabled,
    (
      locations,
      flows,
      flowmapColors,
      locationsById,
      locationIdsInViewport,
      getInCircleSize,
      getOutCircleSize,
      flowThicknessScale,
      animationEnabled,
      locationLabelsEnabled,
    ) => {
      return this._prepareLayersData(
        locations,
        flows,
        flowmapColors,
        locationsById,
        locationIdsInViewport,
        getInCircleSize,
        getOutCircleSize,
        flowThicknessScale,
        animationEnabled,
        locationLabelsEnabled,
      );
    },
  );

  prepareLayersData(state: FlowmapState, props: FlowmapData<L, F>): LayersData {
    const locations = this.getLocationsForFlowmapLayer(state, props) || [];
    const flows = this.getFlowsForFlowmapLayer(state, props) || [];
    const flowmapColors = this.getFlowmapColorsRGBA(state, props);
    const locationsById = this.getLocationsForFlowmapLayerById(state, props);
    const locationIdsInViewport = this.getLocationIdsInViewport(state, props);
    const getInCircleSize = this.getInCircleSizeGetter(state, props);
    const getOutCircleSize = this.getOutCircleSizeGetter(state, props);
    const flowThicknessScale = this.getFlowThicknessScale(state, props);
    const locationLabelsEnabled = this.getLocationLabelsEnabled(state, props);
    return this._prepareLayersData(
      locations,
      flows,
      flowmapColors,
      locationsById,
      locationIdsInViewport,
      getInCircleSize,
      getOutCircleSize,
      flowThicknessScale,
      state.settings.animationEnabled,
      locationLabelsEnabled,
    );
  }

  _prepareLayersData(
    locations: (L | ClusterNode)[] | undefined,
    flows: (F | AggregateFlow)[] | undefined,
    flowmapColors: DiffColorsRGBA | ColorsRGBA,
    locationsById: Map<string | number, L | ClusterNode> | undefined,
    locationIdsInViewport: Set<string | number> | undefined,
    getInCircleSize: (locationId: string | number) => number,
    getOutCircleSize: (locationId: string | number) => number,
    flowThicknessScale: ScaleLinear<number, number, never> | undefined,
    animationEnabled: boolean,
    locationLabelsEnabled: boolean,
  ): LayersData {
    if (!locations) locations = [];
    if (!flows) flows = [];
    const {
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      getLocationId,
      getLocationLon,
      getLocationLat,
      getLocationName,
    } = this.accessors;

    const flowMagnitudeExtent = extent(flows, (f) => getFlowMagnitude(f)) as [
      number,
      number,
    ];
    const flowColorScale = getFlowColorScale(
      flowmapColors,
      flowMagnitudeExtent,
      false,
    );

    // Using a generator here helps to avoid creating intermediary arrays
    const circlePositions = Float32Array.from(
      (function* () {
        for (const location of locations) {
          yield getLocationLon(location);
          yield getLocationLat(location);
        }
      })(),
    );

    // TODO: diff mode
    const circleColor = isDiffColorsRGBA(flowmapColors)
      ? flowmapColors.positive.locationCircles.inner
      : flowmapColors.locationCircles.inner;

    const circleColors = Uint8Array.from(
      (function* () {
        for (const location of locations) {
          yield* circleColor;
        }
      })(),
    );

    const inCircleRadii = Float32Array.from(
      (function* () {
        for (const location of locations) {
          const id = getLocationId(location);
          yield locationIdsInViewport?.has(id) ? getInCircleSize(id) : 1.0;
        }
      })(),
    );
    const outCircleRadii = Float32Array.from(
      (function* () {
        for (const location of locations) {
          const id = getLocationId(location);
          yield locationIdsInViewport?.has(id) ? getOutCircleSize(id) : 1.0;
        }
      })(),
    );

    const sourcePositions = Float32Array.from(
      (function* () {
        for (const flow of flows) {
          const loc = locationsById?.get(getFlowOriginId(flow));
          yield loc ? getLocationLon(loc) : 0;
          yield loc ? getLocationLat(loc) : 0;
        }
      })(),
    );
    const targetPositions = Float32Array.from(
      (function* () {
        for (const flow of flows) {
          const loc = locationsById?.get(getFlowDestId(flow));
          yield loc ? getLocationLon(loc) : 0;
          yield loc ? getLocationLat(loc) : 0;
        }
      })(),
    );
    const thicknesses = Float32Array.from(
      (function* () {
        for (const flow of flows) {
          yield flowThicknessScale
            ? flowThicknessScale(getFlowMagnitude(flow)) || 0
            : 0;
        }
      })(),
    );
    const endpointOffsets = Float32Array.from(
      (function* () {
        for (const flow of flows) {
          const originId = getFlowOriginId(flow);
          const destId = getFlowDestId(flow);
          yield Math.max(getInCircleSize(originId), getOutCircleSize(originId));
          yield Math.max(getInCircleSize(destId), getOutCircleSize(destId));
        }
      })(),
    );
    const flowLineColors = Uint8Array.from(
      (function* () {
        for (const flow of flows) {
          yield* flowColorScale(getFlowMagnitude(flow));
        }
      })(),
    );

    const staggeringValues = animationEnabled
      ? Float32Array.from(
          (function* () {
            for (const f of flows) {
              // @ts-ignore
              yield new alea(`${getFlowOriginId(f)}-${getFlowDestId(f)}`)();
            }
          })(),
        )
      : undefined;

    return {
      circleAttributes: {
        length: locations.length,
        attributes: {
          getPosition: {value: circlePositions, size: 2},
          getColor: {value: circleColors, size: 4},
          getInRadius: {value: inCircleRadii, size: 1},
          getOutRadius: {value: outCircleRadii, size: 1},
        },
      },
      lineAttributes: {
        length: flows.length,
        attributes: {
          getSourcePosition: {value: sourcePositions, size: 2},
          getTargetPosition: {value: targetPositions, size: 2},
          getThickness: {value: thicknesses, size: 1},
          getColor: {value: flowLineColors, size: 4},
          getEndpointOffsets: {value: endpointOffsets, size: 2},
          ...(staggeringValues
            ? {getStaggering: {value: staggeringValues, size: 1}}
            : {}),
        },
      },
      ...(locationLabelsEnabled
        ? {locationLabels: locations.map(getLocationName)}
        : undefined),
    };
  }

  getLocationsInBbox(
    tree: KDBushTree,
    bbox: [number, number, number, number],
  ): Array<L> | undefined {
    if (!tree) return undefined;
    return this._getLocationsInBboxIndices(tree, bbox).map(
      (idx: number) => tree.points[idx],
    ) as Array<L>;
  }

  _getLocationsInBboxIndices(
    tree: KDBushTree,
    bbox: [number, number, number, number],
  ) {
    if (!tree) return undefined;
    const [lon1, lat1, lon2, lat2] = bbox;
    const [x1, y1, x2, y2] = [lngX(lon1), latY(lat1), lngX(lon2), latY(lat2)];
    return tree.range(
      Math.min(x1, x2),
      Math.min(y1, y2),
      Math.max(x1, x2),
      Math.max(y1, y2),
    );
  }

  isFlowInSelection(
    flow: F | AggregateFlow,
    selectedLocationsSet: Set<string | number> | undefined,
    locationFilterMode?: LocationFilterMode,
  ) {
    const origin = this.accessors.getFlowOriginId(flow);
    const dest = this.accessors.getFlowDestId(flow);
    if (selectedLocationsSet) {
      switch (locationFilterMode) {
        case LocationFilterMode.ALL:
          return (
            selectedLocationsSet.has(origin) || selectedLocationsSet.has(dest)
          );
        case LocationFilterMode.BETWEEN:
          return (
            selectedLocationsSet.has(origin) && selectedLocationsSet.has(dest)
          );
        case LocationFilterMode.INCOMING:
          return selectedLocationsSet.has(dest);
        case LocationFilterMode.OUTGOING:
          return selectedLocationsSet.has(origin);
      }
    }
    return true;
  }

  // calcLocationTotals(
  //   locations: (L | ClusterNode)[],
  //   flows: F[],
  // ): LocationsTotals {
  //   return flows.reduce(
  //     (acc: LocationsTotals, curr) => {
  //       const originId = this.accessors.getFlowOriginId(curr);
  //       const destId = this.accessors.getFlowDestId(curr);
  //       const magnitude = this.accessors.getFlowMagnitude(curr);
  //       if (originId === destId) {
  //         acc.internal[originId] = (acc.internal[originId] || 0) + magnitude;
  //       } else {
  //         acc.outgoing[originId] = (acc.outgoing[originId] || 0) + magnitude;
  //         acc.incoming[destId] = (acc.incoming[destId] || 0) + magnitude;
  //       }
  //       return acc;
  //     },
  //     {incoming: {}, outgoing: {}, internal: {}},
  //   );
  // }
}

function calcLocationTotalsExtent(
  locationTotals: Map<string | number, LocationTotals> | undefined,
  locationIdsInViewport: Set<string | number> | undefined,
) {
  if (!locationTotals) return undefined;
  let rv: [number, number] | undefined = undefined;
  for (const [
    id,
    {incomingCount, outgoingCount, internalCount},
  ] of locationTotals.entries()) {
    if (locationIdsInViewport == null || locationIdsInViewport.has(id)) {
      const lo = Math.min(
        incomingCount + internalCount,
        outgoingCount + internalCount,
        internalCount,
      );
      const hi = Math.max(
        incomingCount + internalCount,
        outgoingCount + internalCount,
        internalCount,
      );
      if (!rv) {
        rv = [lo, hi];
      } else {
        if (lo < rv[0]) rv[0] = lo;
        if (hi > rv[1]) rv[1] = hi;
      }
    }
  }
  return rv;
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

function aggregateFlows<F>(
  flows: F[],
  flowAccessors: FlowAccessors<F>,
): AggregateFlow[] {
  // Sum up flows with same origin, dest
  const byOriginDest = rollup(
    flows,
    (ff: F[]) => {
      const origin = flowAccessors.getFlowOriginId(ff[0]);
      const dest = flowAccessors.getFlowDestId(ff[0]);
      // const color = ff[0].color;
      const rv: AggregateFlow = {
        aggregate: true,
        origin,
        dest,
        count: ff.reduce((m, f) => {
          const count = flowAccessors.getFlowMagnitude(f);
          if (count) {
            if (!isNaN(count) && isFinite(count)) return m + count;
          }
          return m;
        }, 0),
        // time: undefined,
      };
      // if (color) rv.color = color;
      return rv;
    },
    flowAccessors.getFlowOriginId,
    flowAccessors.getFlowDestId,
  );

  const rv: AggregateFlow[] = [];
  for (const values of byOriginDest.values()) {
    for (const value of values.values()) {
      rv.push(value);
    }
  }
  return rv;
}

/**
 * This is used to augment hover picking info so that we can displace location tooltip
 * @param circleAttributes
 * @param index
 */
export function getOuterCircleRadiusByIndex(
  circleAttributes: FlowCirclesLayerAttributes,
  index: number,
): number {
  const {getInRadius, getOutRadius} = circleAttributes.attributes;
  return Math.max(getInRadius.value[index], getOutRadius.value[index]);
}

export function getLocationCoordsByIndex(
  circleAttributes: FlowCirclesLayerAttributes,
  index: number,
): [number, number] {
  const {getPosition} = circleAttributes.attributes;
  return [getPosition.value[index * 2], getPosition.value[index * 2 + 1]];
}

export function getFlowLineAttributesByIndex(
  lineAttributes: FlowLinesLayerAttributes,
  index: number,
): FlowLinesLayerAttributes {
  const {
    getColor,
    getEndpointOffsets,
    getSourcePosition,
    getTargetPosition,
    getThickness,
    getStaggering,
  } = lineAttributes.attributes;
  return {
    length: 1,
    attributes: {
      getColor: {
        value: getColor.value.subarray(index * 4, (index + 1) * 4),
        size: 4,
      },
      getEndpointOffsets: {
        value: getEndpointOffsets.value.subarray(index * 2, (index + 1) * 2),
        size: 2,
      },
      getSourcePosition: {
        value: getSourcePosition.value.subarray(index * 2, (index + 1) * 2),
        size: 2,
      },
      getTargetPosition: {
        value: getTargetPosition.value.subarray(index * 2, (index + 1) * 2),
        size: 2,
      },
      getThickness: {
        value: getThickness.value.subarray(index, index + 1),
        size: 1,
      },
      ...(getStaggering
        ? {
            getStaggering: {
              value: getStaggering.value.subarray(index, index + 1),
              size: 1,
            },
          }
        : undefined),
    },
  };
}
