import FlowMapDataProvider from './FlowMapDataProvider';
import {
  Cluster,
  ClusterNode,
  FlowAccessors,
  FlowMapData,
  FlowMapDataAccessors,
  LayersData,
  LocationAccessors,
  LocationTotals,
  ViewportProps,
} from '../types';
import {FlowMapState} from '../FlowMapState';
import FlowMapSelectors from '../FlowMapSelectors';
import {AggregateFlow} from '..';

export default class LocalFlowMapDataProvider<L, F>
  implements FlowMapDataProvider<L, F>
{
  private selectors: FlowMapSelectors<L, F>;
  private flowMapData: FlowMapData<L, F> | undefined;
  private flowMapState: FlowMapState | undefined;

  constructor(accessors: FlowMapDataAccessors<L, F>) {
    // scope selectors to the concrete instance of FlowMapDataProvider
    this.selectors = new FlowMapSelectors<L, F>(accessors);
    this.flowMapData = undefined;
    this.flowMapState = undefined;
  }

  setAccessors(accessors: FlowMapDataAccessors<L, F>) {
    this.selectors.setAccessors(accessors);
  }

  async setFlowMapData(flowMapData: FlowMapData<L, F>): Promise<void> {
    this.flowMapData = flowMapData;
  }

  async setFlowMapState(flowMapState: FlowMapState): Promise<void> {
    this.flowMapState = flowMapState;
  }

  async getFlowByIndex(idx: number): Promise<F | AggregateFlow | undefined> {
    if (!this.flowMapState || !this.flowMapData) {
      return undefined;
    }
    const flows = this.selectors.getFlowsForFlowMapLayer(
      this.flowMapState,
      this.flowMapData,
    );
    return flows?.[idx];
  }

  async getLocationByIndex(idx: number): Promise<L | ClusterNode | undefined> {
    if (!this.flowMapState || !this.flowMapData) {
      return undefined;
    }
    const locations = this.selectors.getLocationsForFlowMapLayer(
      this.flowMapState,
      this.flowMapData,
    );
    return locations?.[idx];
  }

  async getLayersData(): Promise<LayersData | undefined> {
    if (!this.flowMapState || !this.flowMapData) {
      return undefined;
    }
    return this.selectors.prepareLayersData(
      this.flowMapState,
      this.flowMapData,
    );
  }

  async getLocationById(id: string): Promise<L | Cluster | undefined> {
    if (!this.flowMapState || !this.flowMapData) {
      return undefined;
    }
    const clusterIndex = this.selectors.getClusterIndex(
      this.flowMapState,
      this.flowMapData,
    );
    if (clusterIndex) {
      const cluster = clusterIndex.getClusterById(id);
      if (cluster) {
        return cluster;
      }
    }
    const locationsById = this.selectors.getLocationsById(
      this.flowMapState,
      this.flowMapData,
    );
    return locationsById?.get(id);
  }

  async getTotalsForLocation(id: string): Promise<LocationTotals | undefined> {
    if (!this.flowMapState || !this.flowMapData) {
      return undefined;
    }
    return this.selectors
      .getLocationTotals(this.flowMapState, this.flowMapData)
      ?.get(id);
  }

  getViewportForLocations(dims: [number, number]): Promise<ViewportProps> {
    return Promise.resolve({} as ViewportProps);
  }
}
