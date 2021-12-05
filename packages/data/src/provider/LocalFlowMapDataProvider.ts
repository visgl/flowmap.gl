import FlowMapDataProvider from './FlowMapDataProvider';
import {ClusterNode, Location, Flow, ViewportProps} from '../types';
import prepareLayersData, {LayersData} from '../prepareLayersData';
import {FlowMapState} from '../FlowMapState';

export default class LocalFlowMapDataProvider implements FlowMapDataProvider {
  private locations: Location[];
  private flows: Flow[];
  private flowMapState: FlowMapState;

  constructor(
    locations: Location[],
    flows: Flow[],
    flowMapState: FlowMapState,
  ) {
    this.locations = locations;
    this.flows = flows;
    this.flowMapState = flowMapState;
  }

  async setFlowMapState(flowMapState: FlowMapState): Promise<void> {
    this.flowMapState = flowMapState;
  }

  async getFlowByIndex(index: number): Promise<Flow> {
    return Promise.resolve({} as Flow);
  }

  async getLayersData(): Promise<LayersData> {
    const {locations, flows} = this;
    // TODO: scope selectors to the concrete instance of FlowMapDataProvider
    return prepareLayersData(this.flowMapState, {locations, flows});
  }

  async getLocationById(id: string): Promise<undefined> {
    return undefined;
  }

  async getLocationByIndex(idx: number): Promise<undefined> {
    return undefined;
  }

  getViewportForLocations(dims: [number, number]): Promise<ViewportProps> {
    return Promise.resolve({} as ViewportProps);
  }
}
