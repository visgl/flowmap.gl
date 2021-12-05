import {FlowMapState} from '../FlowMapState';
import {ClusterNode, Flow, LocationTotals, ViewportProps} from '../types';
import {LayersData} from '../prepareLayersData';

export default interface FlowMapDataProvider {
  setFlowMapState(flowMapState: FlowMapState): Promise<void>;

  // clearData(): void;

  getViewportForLocations(dims: [number, number]): Promise<ViewportProps>;

  // getFlowTotals(): Promise<FlowTotals>;

  getFlowByIndex(index: number): Promise<Flow>;

  getLocationById(id: string): Promise<Location | ClusterNode | undefined>;

  getLocationByIndex(idx: number): Promise<Location | ClusterNode | undefined>;

  // getTotalsForLocation(id: string): Promise<LocationTotals | undefined>;

  // getLocationsInBbox(
  //   bbox: [number, number, number, number],
  // ): Promise<Array<Location | ClusterNode> | undefined>;

  // getLocationsForSearchBox(): Promise<(Location | ClusterNode)[] | undefined>;

  getLayersData(): Promise<LayersData>;
}
