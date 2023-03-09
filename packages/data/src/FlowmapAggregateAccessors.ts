/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AggregateFlow,
  ClusterNode,
  FlowmapDataAccessors,
  isAggregateFlow,
  isCluster,
  isLocationClusterNode,
} from './types';

export default class FlowmapAggregateAccessors<
  L extends Record<string, any>,
  F extends Record<string, any>,
> {
  private accessors: FlowmapDataAccessors<L, F>;
  constructor(accessors: FlowmapDataAccessors<L, F>) {
    this.accessors = accessors;
  }

  setAccessors(accessors: FlowmapDataAccessors<L, F>) {
    this.accessors = accessors;
  }

  getFlowmapDataAccessors() {
    return this.accessors;
  }

  getLocationId = (location: L | ClusterNode): string | number =>
    isLocationClusterNode(location)
      ? location.id
      : this.accessors.getLocationId(location);

  getLocationName = (location: L | ClusterNode): string => {
    let name;
    if (isLocationClusterNode(location) && isCluster(location)) {
      name = location.name;
    } else if (this.accessors.getLocationName) {
      name = this.accessors.getLocationName(location as L);
    }
    if (!name) name = `${this.getLocationId(location)}`;
    return name;
  };

  getLocationLat = (location: L | ClusterNode): number =>
    isLocationClusterNode(location)
      ? location.lat
      : this.accessors.getLocationLat(location);

  getLocationLon = (location: L | ClusterNode): number =>
    isLocationClusterNode(location)
      ? location.lon
      : this.accessors.getLocationLon(location);

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
