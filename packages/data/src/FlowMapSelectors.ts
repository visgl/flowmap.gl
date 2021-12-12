import {alea} from 'seedrandom';
import {
  Cluster,
  ClusterNode,
  CountByTime,
  Flow,
  FlowAccessors,
  FlowCirclesLayerAttributes,
  FlowLinesLayerAttributes,
  FlowMapData,
  getFlowDestId,
  getFlowMagnitude,
  getFlowOriginId,
  getFlowTime,
  getLocationId,
  isCluster,
  isLocationClusterNode,
  LayersData,
  Location,
  LocationFilterMode,
  LocationsTotals,
  LocationTotals,
} from './types';
import {ascending, descending, extent, min} from 'd3-array';
import getColors, {
  getColorsRGBA,
  getDiffColorsRGBA,
  getFlowColorScale,
  isDiffColors,
  isDiffColorsRGBA,
} from './colors';
import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
  ParametricSelector,
} from 'reselect';
import {
  buildIndex,
  ClusterIndex,
  findAppropriateZoomLevel,
  makeLocationWeightGetter,
} from './cluster/ClusterIndex';
import {clusterLocations} from './cluster/cluster';
import {
  getTimeGranularityByKey,
  getTimeGranularityByOrder,
  getTimeGranularityForDate,
  TimeGranularityKey,
} from './time';
import {nest} from 'd3-collection';
import {bounds} from '@mapbox/geo-viewport';
import KDBush from 'kdbush';
import {scaleLinear, scaleSqrt} from 'd3-scale';
import {FlowMapState} from './FlowMapState';
import {flatMap} from './util';

const MAX_CLUSTER_ZOOM_LEVEL = 20;
const NUMBER_OF_FLOWS_TO_DISPLAY = 5000;
type KDBushTree = any;

export const getLocationCentroid = (
  location: Location | ClusterNode,
): [number, number] =>
  isLocationClusterNode(location)
    ? location.centroid
    : [(location as Location).lon, (location as Location).lat];

export type Selector<T> = ParametricSelector<FlowMapState, FlowMapData, T>;

const getFetchedFlows = (state: FlowMapState, props: FlowMapData) =>
  props.flows;
const getFetchedLocations = (state: FlowMapState, props: FlowMapData) =>
  props.locations;
const getSelectedLocations = (state: FlowMapState, props: FlowMapData) =>
  state.filterState.selectedLocations;
const getLocationFilterMode = (state: FlowMapState, props: FlowMapData) =>
  state.filterState.locationFilterMode;
const getClusteringEnabled = (state: FlowMapState, props: FlowMapData) =>
  state.settingsState.clusteringEnabled;
const getLocationTotalsEnabled = (state: FlowMapState, props: FlowMapData) =>
  state.settingsState.locationTotalsEnabled;
const getZoom = (state: FlowMapState, props: FlowMapData) =>
  state.viewport.zoom;
const getViewport = (state: FlowMapState, props: FlowMapData) => state.viewport;
const getSelectedTimeRange = (state: FlowMapState, props: FlowMapData) =>
  state.filterState.selectedTimeRange;

const getColorSchemeKey: Selector<string | undefined> = (
  state: FlowMapState,
  props: FlowMapData,
) => state.settingsState.colorSchemeKey;

const getDarkMode: Selector<boolean> = (
  state: FlowMapState,
  props: FlowMapData,
) => state.settingsState.darkMode;

const getFadeEnabled: Selector<boolean> = (
  state: FlowMapState,
  props: FlowMapData,
) => state.settingsState.fadeEnabled;

const getFadeAmount: Selector<number> = (
  state: FlowMapState,
  props: FlowMapData,
) => state.settingsState.fadeAmount;

const getAnimate: Selector<boolean> = (
  state: FlowMapState,
  props: FlowMapData,
) => state.settingsState.animationEnabled;

export default class FlowMapSelectors {
  getInvalidLocationIds: Selector<string[] | undefined> = createSelector(
    getFetchedLocations,
    (locations) => {
      if (!locations) return undefined;
      const invalid = [];
      for (const location of locations) {
        if (
          !(-90 <= location.lat && location.lat <= 90) ||
          !(-180 <= location.lon && location.lon <= 180)
        ) {
          invalid.push(location.id);
        }
      }
      return invalid.length > 0 ? invalid : undefined;
    },
  );

  getLocations: Selector<Location[] | undefined> = createSelector(
    getFetchedLocations,
    this.getInvalidLocationIds,
    (locations, invalidIds) => {
      if (!locations) return undefined;
      if (!invalidIds || invalidIds.length === 0) return locations;
      const invalid = new Set(invalidIds);
      return locations.filter(
        (location: Location) => !invalid.has(getLocationId(location)),
      );
    },
  );

  getLocationIds: Selector<Set<string> | undefined> = createSelector(
    this.getLocations,
    (locations) =>
      locations ? new Set(locations.map(getLocationId)) : undefined,
  );

  getSelectedLocationsSet: Selector<Set<string> | undefined> = createSelector(
    getSelectedLocations,
    (ids) => (ids && ids.length > 0 ? new Set(ids) : undefined),
  );

  getSortedFlowsForKnownLocations: Selector<Flow[] | undefined> =
    createSelector(getFetchedFlows, this.getLocationIds, (flows, ids) => {
      if (!ids || !flows) return undefined;
      return flows
        .filter(
          (flow: Flow) =>
            ids.has(getFlowOriginId(flow)) && ids.has(getFlowDestId(flow)),
        )
        .sort((a: Flow, b: Flow) =>
          descending(
            Math.abs(getFlowMagnitude(a)),
            Math.abs(getFlowMagnitude(b)),
          ),
        );
    });

  getActualTimeExtent: Selector<[Date, Date] | undefined> = createSelector(
    this.getSortedFlowsForKnownLocations,
    (flows) => {
      if (!flows) return undefined;
      let start = null;
      let end = null;
      for (const {time} of flows) {
        if (time) {
          if (start == null || start > time) start = time;
          if (end == null || end < time) end = time;
        }
      }
      if (!start || !end) return undefined;
      return [start, end];
    },
  );

  getTimeGranularityKey: Selector<TimeGranularityKey | undefined> =
    createSelector(
      this.getSortedFlowsForKnownLocations,
      this.getActualTimeExtent,
      (flows, timeExtent) => {
        if (!flows || !timeExtent) return undefined;

        const minOrder = min(flows, (d) => {
          const t = getFlowTime(d);
          return t ? getTimeGranularityForDate(t).order : null;
        });
        if (minOrder == null) return undefined;
        const timeGranularity = getTimeGranularityByOrder(minOrder);
        return timeGranularity ? timeGranularity.key : undefined;
      },
    );

  getTimeExtent: Selector<[Date, Date] | undefined> = createSelector(
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

  getSortedFlowsForKnownLocationsFilteredByTime: Selector<Flow[] | undefined> =
    createSelector(
      this.getSortedFlowsForKnownLocations,
      this.getTimeExtent,
      getSelectedTimeRange,
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
          const time = getFlowTime(flow);
          return time && timeRange[0] <= time && time < timeRange[1];
        });
      },
    );

  getLocationsHavingFlows: Selector<Location[] | undefined> = createSelector(
    this.getSortedFlowsForKnownLocations,
    this.getLocations,
    (flows, locations) => {
      if (!locations || !flows) return locations;
      const withFlows = new Set();
      for (const flow of flows) {
        withFlows.add(getFlowOriginId(flow));
        withFlows.add(getFlowDestId(flow));
      }
      return locations.filter((location: Location) =>
        withFlows.has(getLocationId(location)),
      );
    },
  );

  getLocationsById: Selector<Map<string, Location> | undefined> =
    createSelector(this.getLocationsHavingFlows, (locations) => {
      if (!locations) return undefined;
      return nest<Location, Location>()
        .key((d: Location) => d.id)
        .rollup(([d]) => d)
        .map(locations) as any as Map<string, Location>;
    });

  getClusterIndex: Selector<ClusterIndex | undefined> = createSelector(
    this.getLocationsHavingFlows,
    this.getLocationsById,
    this.getSortedFlowsForKnownLocations,
    (locations, locationsById, flows) => {
      if (!locations || !locationsById || !flows) return undefined;

      const getLocationWeight = makeLocationWeightGetter(flows, {
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
      });
      const clusterLevels = clusterLocations(
        locations,
        {getLocationId, getLocationCentroid},
        getLocationWeight,
        {
          maxZoom: MAX_CLUSTER_ZOOM_LEVEL,
        },
      );
      const clusterIndex = buildIndex(clusterLevels);

      // Adding meaningful names
      const getName = (id: string) => {
        const loc = locationsById.get(id);
        if (loc) return loc.name || loc.id || id;
        return `#${id}`;
      };
      for (const level of clusterLevels) {
        for (const node of level.nodes) {
          // Here mutating the nodes (adding names)
          if (isCluster(node)) {
            const leaves = clusterIndex.expandCluster(node);
            const topId = leaves.reduce((m: string | undefined, d: string) =>
              !m || getLocationWeight(d) > getLocationWeight(m) ? d : m,
            );
            const otherId =
              leaves.length === 2 && leaves.find((id: string) => id !== topId);
            node.name = `"${getName(topId)}" and ${
              otherId ? `"${getName(otherId)}"` : `${leaves.length - 1} others`
            }`;
          } else {
            (node as any).name = getName(node.id);
          }
        }
      }

      return clusterIndex;
    },
  );

  getAvailableClusterZoomLevels = createSelector(
    this.getClusterIndex,
    getSelectedLocations,
    (clusterIndex, selectedLocations): number[] | undefined => {
      if (!clusterIndex) {
        return undefined;
      }

      let maxZoom = Number.POSITIVE_INFINITY;
      let minZoom = Number.NEGATIVE_INFINITY;

      const adjust = (zoneId: string) => {
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

  _getClusterZoom: Selector<number | undefined> = createSelector(
    this.getClusterIndex,
    getZoom,
    this.getAvailableClusterZoomLevels,
    (clusterIndex, mapZoom, availableClusterZoomLevels) => {
      if (!clusterIndex) return undefined;
      if (!availableClusterZoomLevels) {
        return undefined;
      }

      const clusterZoom = findAppropriateZoomLevel(
        availableClusterZoomLevels,
        mapZoom,
      );
      return clusterZoom;
    },
  );

  getClusterZoom = (state: FlowMapState, props: FlowMapData) => {
    const {settingsState} = state;
    if (!settingsState.clusteringEnabled) return undefined;
    if (
      settingsState.clusteringAuto ||
      settingsState.manualClusterZoom == null
    ) {
      return this._getClusterZoom(state, props);
    }
    return settingsState.manualClusterZoom;
  };

  getLocationsForSearchBox: Selector<(Location | Cluster)[] | undefined> =
    createSelector(
      getClusteringEnabled,
      this.getLocationsHavingFlows,
      getSelectedLocations,
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
        let result: (Location | Cluster)[] = locations;
        // if (clusteringEnabled) {
        //   if (clusterIndex) {
        //     const zoomItems = clusterIndex.getClusterNodesFor(clusterZoom);
        //     if (zoomItems) {
        //       result = result.concat(zoomItems.filter(isCluster));
        //     }
        //   }
        // }

        if (result && clusterIndex && selectedLocations) {
          const toAppend = [];
          for (const id of selectedLocations) {
            const cluster = clusterIndex.getClusterById(id);
            if (cluster && !result.find((d) => d.id === id)) {
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

  getDiffMode: Selector<boolean> = createSelector(getFetchedFlows, (flows) => {
    if (flows && flows.find((f: Flow) => getFlowMagnitude(f) < 0)) {
      return true;
    }
    return false;
  });

  _getFlowMapColors = createSelector(
    this.getDiffMode,
    getColorSchemeKey,
    getDarkMode,
    getFadeEnabled,
    getFadeAmount,
    getAnimate,
    getColors,
  );

  getFlowMapColorsRGBA = createSelector(
    this._getFlowMapColors,
    (flowMapColors) => {
      return isDiffColors(flowMapColors)
        ? getDiffColorsRGBA(flowMapColors)
        : getColorsRGBA(flowMapColors);
    },
  );

  getUnknownLocations: Selector<Set<string> | undefined> = createSelector(
    this.getLocationIds,
    getFetchedFlows,
    this.getSortedFlowsForKnownLocations,
    (ids, flows, flowsForKnownLocations) => {
      if (!ids || !flows) return undefined;
      if (
        flowsForKnownLocations &&
        flows.length === flowsForKnownLocations.length
      )
        return undefined;
      const missing = new Set<string>();
      for (const flow of flows) {
        if (!ids.has(getFlowOriginId(flow))) missing.add(getFlowOriginId(flow));
        if (!ids.has(getFlowDestId(flow))) missing.add(getFlowDestId(flow));
      }
      return missing;
    },
  );

  getSortedAggregatedFilteredFlows: Selector<Flow[] | undefined> =
    createSelector(
      this.getClusterIndex,
      getClusteringEnabled,
      this.getSortedFlowsForKnownLocationsFilteredByTime,
      this.getClusterZoom,
      this.getTimeExtent,
      (clusterTree, isClusteringEnabled, flows, clusterZoom, timeExtent) => {
        if (!flows) return undefined;
        let aggregated;
        if (isClusteringEnabled && clusterTree && clusterZoom != null) {
          aggregated = clusterTree.aggregateFlows(
            timeExtent != null
              ? aggregateFlows(flows) // clusterTree.aggregateFlows won't aggregate unclustered across time
              : flows,
            clusterZoom,
            {
              getFlowOriginId,
              getFlowDestId,
              getFlowMagnitude,
            },
          );
        } else {
          aggregated = aggregateFlows(flows);
        }
        aggregated.sort((a, b) =>
          descending(
            Math.abs(getFlowMagnitude(a)),
            Math.abs(getFlowMagnitude(b)),
          ),
        );
        return aggregated;
      },
    );

  _getFlowMagnitudeExtent: Selector<[number, number] | undefined> =
    createSelector(
      this.getSortedAggregatedFilteredFlows,
      this.getSelectedLocationsSet,
      getLocationFilterMode,
      (flows, selectedLocationsSet, locationFilterMode) => {
        if (!flows) return undefined;
        let rv: [number, number] | undefined = undefined;
        for (const f of flows) {
          if (
            getFlowOriginId(f) !== getFlowDestId(f) &&
            isFlowInSelection(f, selectedLocationsSet, locationFilterMode)
          ) {
            const count = getFlowMagnitude(f);
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

  getExpandedSelectedLocationsSet: Selector<Set<string> | undefined> =
    createSelector(
      getClusteringEnabled,
      this.getSelectedLocationsSet,
      this.getClusterIndex,
      (clusteringEnabled, selectedLocations, clusterIndex) => {
        if (!selectedLocations || !clusterIndex) {
          return selectedLocations;
        }

        const result = new Set<string>();
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

  getTotalCountsByTime: Selector<CountByTime[] | undefined> = createSelector(
    this.getSortedFlowsForKnownLocations,
    this.getTimeGranularityKey,
    this.getTimeExtent,
    this.getExpandedSelectedLocationsSet,
    getLocationFilterMode,
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
        if (isFlowInSelection(flow, selectedLocationSet, locationFilterMode)) {
          const key = timeGranularity.interval(getFlowTime(flow)).getTime();
          m.set(key, (m.get(key) ?? 0) + getFlowMagnitude(flow));
        }
        return m;
      }, new Map<number, number>());

      return Array.from(byTime.entries()).map(([millis, count]) => ({
        time: new Date(millis),
        count,
      }));
    },
  );

  getMaxLocationCircleSize: Selector<number> = createSelector(
    getLocationTotalsEnabled,
    (locationTotalsEnabled) => (locationTotalsEnabled ? 17 : 1),
  );

  getViewportBoundingBox: Selector<[number, number, number, number]> =
    createSelector(
      getViewport,
      this.getMaxLocationCircleSize,
      (viewport, maxLocationCircleSize) => {
        const pad = maxLocationCircleSize;
        return bounds(
          [viewport.longitude, viewport.latitude],
          viewport.zoom,
          [viewport.width + pad * 2, viewport.height + pad * 2],
          512,
        );
      },
    );

  getLocationsForZoom: Selector<Location[] | ClusterNode[] | undefined> =
    createSelector(
      getClusteringEnabled,
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

  getLocationTotals: Selector<Map<string, LocationTotals> | undefined> =
    createSelector(
      this.getLocationsForZoom,
      this.getSortedAggregatedFilteredFlows,
      this.getSelectedLocationsSet,
      getLocationFilterMode,
      (locations, flows, selectedLocationsSet, locationFilterMode) => {
        if (!flows) return undefined;
        const totals = new Map<string, LocationTotals>();
        const add = (
          id: string,
          d: Partial<LocationTotals>,
        ): LocationTotals => {
          const rv = totals.get(id) ?? {incoming: 0, outgoing: 0, within: 0};
          if (d.incoming != null) rv.incoming += d.incoming;
          if (d.outgoing != null) rv.outgoing += d.outgoing;
          if (d.within != null) rv.within += d.within;
          return rv;
        };
        for (const f of flows) {
          if (isFlowInSelection(f, selectedLocationsSet, locationFilterMode)) {
            const originId = getFlowOriginId(f);
            const destId = getFlowDestId(f);
            const count = getFlowMagnitude(f);
            if (originId === destId) {
              totals.set(originId, add(originId, {within: count}));
            } else {
              totals.set(originId, add(originId, {outgoing: count}));
              totals.set(destId, add(destId, {incoming: count}));
            }
          }
        }
        return totals;
      },
    );

  getLocationsTree: Selector<KDBushTree> = createSelector(
    this.getLocationsForZoom,
    (locations) => {
      if (!locations) {
        return undefined;
      }
      return new KDBush(
        // @ts-ignore
        locations,
        (location: Location | ClusterNode) =>
          lngX(
            isLocationClusterNode(location)
              ? location.centroid[0]
              : location.lon,
          ),
        (location: Location | ClusterNode) =>
          latY(
            isLocationClusterNode(location)
              ? location.centroid[1]
              : location.lat,
          ),
      );
    },
  );

  _getLocationIdsInViewport: Selector<Set<string> | undefined> = createSelector(
    this.getLocationsTree,
    this.getViewportBoundingBox,
    (tree: KDBushTree, bbox: [number, number, number, number]) => {
      const ids = _getLocationsInBboxIndices(tree, bbox);
      if (ids) {
        return new Set(
          ids.map((idx: number) => tree.points[idx].id) as Array<string>,
        );
      }
      return undefined;
    },
  );

  getLocationIdsInViewport: Selector<Set<string> | undefined> =
    // @ts-ignore
    createSelectorCreator<Set<string> | undefined>(
      // @ts-ignore
      defaultMemoize,
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

  getTotalUnfilteredCount: Selector<number | undefined> = createSelector(
    this.getSortedFlowsForKnownLocations,
    (flows) => {
      if (!flows) return undefined;
      return flows.reduce((m, flow) => m + getFlowMagnitude(flow), 0);
    },
  );

  getTotalFilteredCount: Selector<number | undefined> = createSelector(
    this.getSortedAggregatedFilteredFlows,
    this.getSelectedLocationsSet,
    getLocationFilterMode,
    (flows, selectedLocationSet, locationFilterMode) => {
      if (!flows) return undefined;
      const count = flows.reduce((m, flow) => {
        if (isFlowInSelection(flow, selectedLocationSet, locationFilterMode)) {
          return m + getFlowMagnitude(flow);
        }
        return m;
      }, 0);
      return count;
    },
  );

  _getLocationTotalsExtent: Selector<[number, number] | undefined> =
    createSelector(this.getLocationTotals, (locationTotals) =>
      calcLocationTotalsExtent(locationTotals, undefined),
    );

  _getLocationTotalsForViewportExtent: Selector<[number, number] | undefined> =
    createSelector(
      this.getLocationTotals,
      this.getLocationIdsInViewport,
      (locationTotals, locationsInViewport) =>
        calcLocationTotalsExtent(locationTotals, locationsInViewport),
    );

  getLocationTotalsExtent = (
    state: FlowMapState,
    props: FlowMapData,
  ): [number, number] | undefined => {
    if (state.settingsState.adaptiveScalesEnabled) {
      return this._getLocationTotalsForViewportExtent(state, props);
    } else {
      return this._getLocationTotalsExtent(state, props);
    }
  };

  getFlowsForFlowMapLayer: Selector<Flow[] | undefined> = createSelector(
    this.getSortedAggregatedFilteredFlows,
    this.getLocationIdsInViewport,
    this.getSelectedLocationsSet,
    getLocationFilterMode,
    (
      flows,
      locationIdsInViewport,
      selectedLocationsSet,
      locationFilterMode,
    ) => {
      if (!flows || !locationIdsInViewport) return undefined;
      const picked: Flow[] = [];
      let pickedCount = 0;
      for (const flow of flows) {
        const {origin, dest} = flow;
        if (
          locationIdsInViewport.has(origin) ||
          locationIdsInViewport.has(dest)
        ) {
          if (
            isFlowInSelection(flow, selectedLocationsSet, locationFilterMode)
          ) {
            if (origin !== dest) {
              // exclude self-loops
              picked.push(flow);
              pickedCount++;
            }
          }
        }
        // Only keep top
        if (pickedCount > NUMBER_OF_FLOWS_TO_DISPLAY) break;
      }
      // assuming they are sorted in descending order,
      // we need ascending for rendering
      return picked.reverse();
    },
  );

  getFlowMagnitudeExtent(
    state: FlowMapState,
    props: FlowMapData,
  ): [number, number] | undefined {
    if (state.settingsState.adaptiveScalesEnabled) {
      const flows = this.getFlowsForFlowMapLayer(state, props);
      if (flows) {
        const rv = extent(flows, getFlowMagnitude);
        return rv[0] !== undefined && rv[1] !== undefined ? rv : undefined;
      } else {
        return undefined;
      }
    } else {
      return this._getFlowMagnitudeExtent(state, props);
    }
  }

  getLocationMaxAbsTotalGetter = createSelector(
    this.getLocationTotals,
    (locationTotals) => {
      return (locationId: string) => {
        const total = locationTotals?.get(locationId);
        if (!total) return undefined;
        return Math.max(
          Math.abs(total.incoming + total.within),
          Math.abs(total.outgoing + total.within),
        );
      };
    },
  );

  getFlowThicknessScale = (state: FlowMapState, props: FlowMapData) => {
    const magnitudeExtent = this.getFlowMagnitudeExtent(state, props);
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

  getCircleSizeScale = (state: FlowMapState, props: FlowMapData) => {
    const maxLocationCircleSize = this.getMaxLocationCircleSize(state, props);
    const {locationTotalsEnabled} = state.settingsState;
    if (!locationTotalsEnabled) {
      return () => maxLocationCircleSize;
    }

    const locationTotalsExtent = this.getLocationTotalsExtent(state, props);
    if (!locationTotalsExtent) return undefined;
    return scaleSqrt()
      .range([0, maxLocationCircleSize])
      .domain([
        0,
        // should support diff mode too
        Math.max.apply(
          null,
          locationTotalsExtent.map((x: number | undefined) => Math.abs(x || 0)),
        ),
      ]);
  };

  getInCircleSizeGetter = createSelector(
    this.getCircleSizeScale,
    this.getLocationTotals,
    (circleSizeScale, locationTotals) => {
      return (locationId: string) => {
        const total = locationTotals?.get(locationId);
        if (total && circleSizeScale) {
          return circleSizeScale(Math.abs(total.incoming + total.within)) || 0;
        }
        return 0;
      };
    },
  );

  getOutCircleSizeGetter = createSelector(
    this.getCircleSizeScale,
    this.getLocationTotals,
    (circleSizeScale, locationTotals) => {
      return (locationId: string) => {
        const total = locationTotals?.get(locationId);
        if (total && circleSizeScale) {
          return circleSizeScale(Math.abs(total.outgoing + total.within)) || 0;
        }
        return 0;
      };
    },
  );

  getSortedLocationsForZoom: Selector<Location[] | ClusterNode[] | undefined> =
    createSelector(
      this.getLocationsForZoom,
      this.getInCircleSizeGetter,
      this.getOutCircleSizeGetter,
      (locations, getInCircleSize, getOutCircleSize) => {
        if (!locations) return undefined;
        const nextLocations = [...locations] as Location[] | ClusterNode[];
        return nextLocations.sort((a, b) =>
          ascending(
            Math.max(getInCircleSize(a.id), getOutCircleSize(a.id)),
            Math.max(getInCircleSize(b.id), getOutCircleSize(b.id)),
          ),
        );
      },
    );

  getLocationsForFlowMapLayer: Selector<
    Array<Location | ClusterNode> | undefined
  > = createSelector(
    this.getSortedLocationsForZoom,
    this.getLocationIdsInViewport,
    (locations, locationIdsInViewport) => {
      if (!locations) return undefined;
      if (!locationIdsInViewport) return locations;
      if (locationIdsInViewport.size === locations.length) return locations;
      // const filtered = [];
      // for (const loc of locations) {
      //   if (locationIdsInViewport.has(loc.id)) {
      //     filtered.push(loc);
      //   }
      // }
      // return filtered;
      // @ts-ignore
      // return locations.filter(
      //   (loc: Location | ClusterNode) => locationIdsInViewport!.has(loc.id)
      // );
      // TODO: return location in viewport + "connected" ones
      return locations;
    },
  );

  getLocationsForFlowMapLayerById: Selector<
    Map<string, Location | ClusterNode> | undefined
  > = createSelector(this.getLocationsForFlowMapLayer, (locations) => {
    if (!locations) return undefined;
    return locations.reduce(
      (m, d) => (m.set(getLocationId(d), d), m),
      new Map(),
    );
  });

  prepareLayersData(state: FlowMapState, props: FlowMapData): LayersData {
    const locations = this.getLocationsForFlowMapLayer(state, props) || [];
    const flows = this.getFlowsForFlowMapLayer(state, props) || [];

    const flowMapColors = this.getFlowMapColorsRGBA(state, props);
    const {settingsState} = state;

    const locationsById = this.getLocationsForFlowMapLayerById(state, props);
    const getCentroid = (id: string) => {
      const loc = locationsById?.get(id);
      return loc ? getLocationCentroid(loc) : [0, 0];
    };

    const locationIdsInViewport = this.getLocationIdsInViewport(state, props);
    const getInCircleSize = this.getInCircleSizeGetter(state, props);
    const getOutCircleSize = this.getOutCircleSizeGetter(state, props);

    const flowThicknessScale = this.getFlowThicknessScale(state, props);

    const flowMagnitudeExtent = extent(flows, (f) => getFlowMagnitude(f)) as [
      number,
      number,
    ];
    const flowColorScale = getFlowColorScale(
      flowMapColors,
      flowMagnitudeExtent,
      false,
    );

    const circlePositions = new Float32Array(
      flatMap(locations, getLocationCentroid),
    );

    // TODO: diff mode
    const circleColor = isDiffColorsRGBA(flowMapColors)
      ? flowMapColors.positive.locationCircles.inner
      : flowMapColors.locationCircles.inner;

    const circleColors = new Uint8Array(flatMap(locations, (d) => circleColor));
    const inCircleRadii = new Float32Array(
      locations.map((loc) =>
        locationIdsInViewport?.has(loc.id)
          ? getInCircleSize(getLocationId(loc))
          : 1.0,
      ),
    );
    const outCircleRadii = new Float32Array(
      locations.map((loc) =>
        locationIdsInViewport?.has(loc.id)
          ? getOutCircleSize(getLocationId(loc))
          : 1.0,
      ),
    );

    const sourcePositions = new Float32Array(
      flatMap(flows, (d: Flow) => getCentroid(d.origin)),
    );
    const targetPositions = new Float32Array(
      flatMap(flows, (d: Flow) => getCentroid(d.dest)),
    );
    const thicknesses = new Float32Array(
      flows.map((d: Flow) =>
        flowThicknessScale ? flowThicknessScale(d.count) || 0 : 0,
      ),
    );
    const endpointOffsets = new Float32Array(
      flatMap(flows, (d: Flow) => [
        Math.max(getInCircleSize(d.origin), getOutCircleSize(d.origin)),
        Math.max(getInCircleSize(d.dest), getOutCircleSize(d.dest)),
      ]),
    );
    const flowLineColors = new Uint8Array(
      flatMap(flows, (f: Flow) => flowColorScale(getFlowMagnitude(f))),
    );

    const staggeringValues = settingsState.animationEnabled
      ? new Float32Array(
          flows.map((f: Flow) =>
            // @ts-ignore
            new alea(`${f.origin}-${f.dest}`)(),
          ),
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
    };
  }
}

export function getLocationsInBbox(
  tree: KDBushTree,
  bbox: [number, number, number, number],
): Array<Location> | undefined {
  if (!tree) return undefined;
  return _getLocationsInBboxIndices(tree, bbox).map(
    (idx: number) => tree.points[idx],
  ) as Array<Location>;
}

function isFlowInSelection(
  flow: Flow,
  selectedLocationsSet: Set<string> | undefined,
  locationFilterMode: LocationFilterMode,
) {
  const {origin, dest} = flow;
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

function calcLocationTotalsExtent(
  locationTotals: Map<string, LocationTotals> | undefined,
  locationIdsInViewport: Set<string> | undefined,
) {
  if (!locationTotals) return undefined;
  let rv: [number, number] | undefined = undefined;
  for (const [id, {incoming, outgoing, within}] of locationTotals.entries()) {
    if (locationIdsInViewport == null || locationIdsInViewport.has(id)) {
      const lo = Math.min(incoming + within, outgoing + within, within);
      const hi = Math.max(incoming + within, outgoing + within, within);
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

export function calcLocationTotals(
  locations: (Location | ClusterNode)[],
  flows: Flow[],
  inputAccessors: FlowAccessors,
): LocationsTotals {
  const {getFlowOriginId, getFlowDestId, getFlowMagnitude} = inputAccessors;
  return flows.reduce(
    (acc: LocationsTotals, curr) => {
      const originId = getFlowOriginId(curr);
      const destId = getFlowDestId(curr);
      const magnitude = getFlowMagnitude(curr);
      if (originId === destId) {
        acc.within[originId] = (acc.within[originId] || 0) + magnitude;
      } else {
        acc.outgoing[originId] = (acc.outgoing[originId] || 0) + magnitude;
        acc.incoming[destId] = (acc.incoming[destId] || 0) + magnitude;
      }
      return acc;
    },
    {incoming: {}, outgoing: {}, within: {}},
  );
}

function aggregateFlows(flows: Flow[]) {
  // Sum up flows with same origin, dest
  const byOriginDest = nest<Flow, Flow>()
    .key(getFlowOriginId)
    .key(getFlowDestId)
    .rollup((ff: Flow[]) => {
      const origin = getFlowOriginId(ff[0]);
      const dest = getFlowDestId(ff[0]);
      const color = ff[0].color;
      const rv: Flow = {
        origin,
        dest,
        count: ff.reduce((m, f) => {
          const count = getFlowMagnitude(f);
          if (count) {
            if (!isNaN(count) && isFinite(count)) return m + count;
          }
          return m;
        }, 0),
        time: undefined,
      };
      if (color) rv.color = color;
      return rv;
    })
    .entries(flows);
  const rv: Flow[] = [];
  for (const {values} of byOriginDest) {
    for (const {value} of values) {
      rv.push(value);
    }
  }
  return rv;
}

function _getLocationsInBboxIndices(
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
