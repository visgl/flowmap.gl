/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {AggregateFlow, Cluster, LocationAccessors, LocationTotals} from '..';
import {FlowmapState} from '../FlowmapState';
import {
  ClusterNode,
  FlowmapData,
  FlowmapDataAccessors,
  LayersData,
  ViewportProps,
} from '../types';

export default interface FlowmapDataProvider<L, F> {
  setAccessors(accessors: FlowmapDataAccessors<L, F>): void;

  setFlowmapState(flowmapState: FlowmapState): Promise<void>;

  // clearData(): void;

  getViewportForLocations(
    dims: [number, number],
  ): Promise<ViewportProps | undefined>;

  // getFlowTotals(): Promise<FlowTotals>;

  getFlowByIndex(index: number): Promise<F | AggregateFlow | undefined>;

  getLocationById(id: string | number): Promise<L | Cluster | undefined>;

  getLocationByIndex(idx: number): Promise<L | ClusterNode | undefined>;

  getTotalsForLocation(
    id: string | number,
  ): Promise<LocationTotals | undefined>;

  // getLocationsInBbox(
  //   bbox: [number, number, number, number],
  // ): Promise<Array<FlowLocation | ClusterNode> | undefined>;

  // getLocationsForSearchBox(): Promise<(FlowLocation | ClusterNode)[] | undefined>;

  getLayersData(): Promise<LayersData | undefined>;

  /**
   * This is to give the data provider control over when/how often layersData
   * is updated which leads to the flowmap being redrawn.
   */
  updateLayersData(
    setLayersData: (layersData: LayersData | undefined) => void,
    changeFlags: Record<string, boolean>,
  ): Promise<void>;
}

export function isFlowmapData<L, F>(
  data: Record<string, any>,
): data is FlowmapData<L, F> {
  return (
    data && data.locations && data.flows
    // TODO: test that they are iterable
    // Array.isArray(data.locations) &&
    // Array.isArray(data.flows)
  );
}

export function isFlowmapDataProvider<L, F>(
  dataProvider: Record<string, any>,
): dataProvider is FlowmapDataProvider<L, F> {
  return (
    dataProvider &&
    typeof dataProvider.setFlowmapState === 'function' &&
    typeof dataProvider.getViewportForLocations === 'function' &&
    typeof dataProvider.getFlowByIndex === 'function' &&
    typeof dataProvider.getLocationById === 'function' &&
    typeof dataProvider.getLocationByIndex === 'function' &&
    typeof dataProvider.getLayersData === 'function'
  );
}
