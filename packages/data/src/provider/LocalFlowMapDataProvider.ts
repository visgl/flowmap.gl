import FlowMapDataProvider from './FlowMapDataProvider';
import {
  ClusterNode,
  Flow,
  FlowMapData,
  LayersData,
  ViewportProps,
  Location,
} from '../types';
import {FlowMapState} from '../FlowMapState';
import FlowMapSelectors from '../FlowMapSelectors';

export default class LocalFlowMapDataProvider implements FlowMapDataProvider {
  private selectors: FlowMapSelectors;
  private flowMapData: FlowMapData;
  private flowMapState: FlowMapState;

  constructor(flowMapData: FlowMapData, flowMapState: FlowMapState) {
    // scope selectors to the concrete instance of FlowMapDataProvider
    this.selectors = new FlowMapSelectors();
    this.flowMapData = flowMapData;
    this.flowMapState = flowMapState;
  }

  async setFlowMapState(flowMapState: FlowMapState): Promise<void> {
    this.flowMapState = flowMapState;
  }

  async getFlowByIndex(idx: number): Promise<Flow | undefined> {
    const flows = this.selectors.getFlowsForFlowMapLayer(
      this.flowMapState,
      this.flowMapData,
    );
    return flows?.[idx];
  }

  async getLocationByIndex(
    idx: number,
  ): Promise<Location | ClusterNode | undefined> {
    const locations = this.selectors.getLocationsForFlowMapLayer(
      this.flowMapState,
      this.flowMapData,
    );
    return locations?.[idx];
  }

  async getLayersData(): Promise<LayersData> {
    return this.selectors.prepareLayersData(
      this.flowMapState,
      this.flowMapData,
    );
  }

  async getLocationById(
    id: string,
  ): Promise<Location | ClusterNode | undefined> {
    const locationsById = this.selectors.getLocationsById(
      this.flowMapState,
      this.flowMapData,
    );
    return locationsById?.get(id);
  }

  getViewportForLocations(dims: [number, number]): Promise<ViewportProps> {
    return Promise.resolve({} as ViewportProps);
  }
}
