import type FlowmapDataProvider from './FlowmapDataProvider';
import type {
  Cluster,
  ClusterNode,
  FlowmapData,
  FlowmapDataAccessors,
  LayersData,
  LocationTotals,
  ViewportProps,
  AggregateFlow,
} from '../types';
import {FlowmapState} from '../FlowmapState';
import FlowmapSelectors from '../FlowmapSelectors';
import {
  GetViewStateOptions,
  getViewStateForLocations,
} from '../getViewStateForLocations';

export default class LocalFlowmapDataProvider<L, F>
  implements FlowmapDataProvider<L, F>
{
  private selectors: FlowmapSelectors<L, F>;
  private flowmapData: FlowmapData<L, F> | undefined;
  private flowmapState: FlowmapState | undefined;

  constructor(accessors: FlowmapDataAccessors<L, F>) {
    // scope selectors to the concrete instance of FlowmapDataProvider
    this.selectors = new FlowmapSelectors<L, F>(accessors);
    this.flowmapData = undefined;
    this.flowmapState = undefined;
  }

  setAccessors(accessors: FlowmapDataAccessors<L, F>) {
    this.selectors.setAccessors(accessors);
  }

  async setFlowmapData(flowmapData: FlowmapData<L, F>): Promise<void> {
    this.flowmapData = flowmapData;
  }

  async setFlowmapState(flowmapState: FlowmapState): Promise<void> {
    this.flowmapState = flowmapState;
  }

  async getFlowByIndex(idx: number): Promise<F | AggregateFlow | undefined> {
    if (!this.flowmapState || !this.flowmapData) {
      return undefined;
    }
    const flows = this.selectors.getFlowsForFlowmapLayer(
      this.flowmapState,
      this.flowmapData,
    );
    return flows?.[idx];
  }

  async getLocationByIndex(idx: number): Promise<L | ClusterNode | undefined> {
    if (!this.flowmapState || !this.flowmapData) {
      return undefined;
    }
    const locations = this.selectors.getLocationsForFlowmapLayer(
      this.flowmapState,
      this.flowmapData,
    );
    return locations?.[idx];
  }

  async getLayersData(): Promise<LayersData | undefined> {
    if (!this.flowmapState || !this.flowmapData) {
      return undefined;
    }
    return this.selectors.getLayersData(this.flowmapState, this.flowmapData);
  }

  async getLocationById(id: string): Promise<L | Cluster | undefined> {
    if (!this.flowmapState || !this.flowmapData) {
      return undefined;
    }
    const clusterIndex = this.selectors.getClusterIndex(
      this.flowmapState,
      this.flowmapData,
    );
    if (clusterIndex) {
      const cluster = clusterIndex.getClusterById(id);
      if (cluster) {
        return cluster;
      }
    }
    const locationsById = this.selectors.getLocationsById(
      this.flowmapState,
      this.flowmapData,
    );
    return locationsById?.get(id);
  }

  async getTotalsForLocation(id: string): Promise<LocationTotals | undefined> {
    if (!this.flowmapState || !this.flowmapData) {
      return undefined;
    }
    return this.selectors
      .getLocationTotals(this.flowmapState, this.flowmapData)
      ?.get(id);
  }

  async getViewportForLocations(
    dims: [number, number],
    opts?: GetViewStateOptions,
  ): Promise<ViewportProps | undefined> {
    if (!this.flowmapData?.locations) {
      return undefined;
    }
    // @ts-ignore
    return getViewStateForLocations(
      this.flowmapData.locations,
      this.selectors.accessors.getLocationCentroid,
      dims,
      opts,
    );
  }
}