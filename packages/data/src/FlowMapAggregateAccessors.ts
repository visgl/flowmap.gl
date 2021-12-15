import {
  AggregateFlow,
  ClusterNode,
  FlowMapDataAccessors,
  isAggregateFlow,
  isCluster,
  isLocationClusterNode,
} from './types';

export default class FlowMapAggregateAccessors<L, F> {
  private accessors: FlowMapDataAccessors<L, F>;
  constructor(accessors: FlowMapDataAccessors<L, F>) {
    this.accessors = accessors;
  }

  setAccessors(accessors: FlowMapDataAccessors<L, F>) {
    this.accessors = accessors;
  }

  getFlowMapDataAccessors() {
    return this.accessors;
  }

  getLocationId = (location: L | ClusterNode): string =>
    isLocationClusterNode(location)
      ? location.id
      : this.accessors.getLocationId(location);

  getLocationName = (location: L | ClusterNode): string =>
    (isLocationClusterNode(location) && isCluster(location)
      ? location.name
      : undefined) ?? this.getLocationId(location);
  // ? location.name // TODO getLocationName for locations and clusters
  // : this.accessors.getLocationName
  // ? this.accessors.getLocationName(location)
  // : this.getLocationId(location);

  getLocationCentroid = (location: L | ClusterNode): [number, number] =>
    isLocationClusterNode(location)
      ? location.centroid
      : this.accessors.getLocationCentroid(location);

  getFlowOriginId = (f: F | AggregateFlow) => {
    return isAggregateFlow(f) ? f.origin : this.accessors.getFlowOriginId(f);
  };

  getFlowDestId = (f: F | AggregateFlow) => {
    return isAggregateFlow(f) ? f.dest : this.accessors.getFlowDestId(f);
  };

  getFlowMagnitude = (f: F | AggregateFlow) => {
    return isAggregateFlow(f) ? f.count : this.accessors.getFlowMagnitude(f);
  };

  // Note: Aggregate flows have no time
  getFlowTime = (f: F) => {
    const {getFlowTime} = this.accessors;
    return getFlowTime ? getFlowTime(f) : undefined;
  };
}
