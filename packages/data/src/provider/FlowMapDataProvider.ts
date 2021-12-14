import {AggregateFlow, LocationAccessors} from '..';
import {FlowMapState} from '../FlowMapState';
import {
  ClusterNode,
  FlowMapData,
  FlowMapDataAccessors,
  LayersData,
  ViewportProps,
} from '../types';

export default interface FlowMapDataProvider<L, F> {
  setAccessors(accessors: FlowMapDataAccessors<L, F>): void;

  setFlowMapState(flowMapState: FlowMapState): Promise<void>;

  // clearData(): void;

  getViewportForLocations(dims: [number, number]): Promise<ViewportProps>;

  // getFlowTotals(): Promise<FlowTotals>;

  getFlowByIndex(index: number): Promise<F | AggregateFlow | undefined>;

  getLocationById(id: string): Promise<L | ClusterNode | undefined>;

  getLocationByIndex(idx: number): Promise<L | ClusterNode | undefined>;

  // getTotalsForLocation(id: string): Promise<LocationTotals | undefined>;

  // getLocationsInBbox(
  //   bbox: [number, number, number, number],
  // ): Promise<Array<FlowLocation | ClusterNode> | undefined>;

  // getLocationsForSearchBox(): Promise<(FlowLocation | ClusterNode)[] | undefined>;

  getLayersData(): Promise<LayersData | undefined>;
}

export function isFlowMapData<L, F>(
  data: Record<string, any>,
): data is FlowMapData<L, F> {
  return (
    data &&
    data.locations &&
    data.flows &&
    Array.isArray(data.locations) &&
    Array.isArray(data.flows)
  );
}

export function isFlowMapDataProvider<L, F>(
  dataProvider: Record<string, any>,
): dataProvider is FlowMapDataProvider<L, F> {
  return (
    dataProvider &&
    typeof dataProvider.setFlowMapState === 'function' &&
    typeof dataProvider.getViewportForLocations === 'function' &&
    typeof dataProvider.getFlowByIndex === 'function' &&
    typeof dataProvider.getLocationById === 'function' &&
    typeof dataProvider.getLocationByIndex === 'function' &&
    typeof dataProvider.getLayersData === 'function'
  );
}
