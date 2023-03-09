/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

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
import {ClusterIndex} from '../cluster/ClusterIndex';

export default class LocalFlowmapDataProvider<
  L extends Record<string, any>,
  F extends Record<string, any>,
> implements FlowmapDataProvider<L, F>
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

  setFlowmapData(flowmapData: FlowmapData<L, F>): void {
    this.flowmapData = flowmapData;
  }

  getSelectors(): FlowmapSelectors<L, F> {
    return this.selectors;
  }

  getFlowmapData(): FlowmapData<L, F> | undefined {
    return this.flowmapData;
  }

  async setFlowmapState(flowmapState: FlowmapState): Promise<void> {
    this.flowmapState = flowmapState;
  }

  getFlowmapState(): FlowmapState | undefined {
    return this.flowmapState;
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

  // TODO: this is unreliable, should replace by unqiue ID
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

  async getLocationById(id: string | number): Promise<L | Cluster | undefined> {
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

  async getTotalsForLocation(
    id: string | number,
  ): Promise<LocationTotals | undefined> {
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
      (loc) => [
        this.selectors.accessors.getLocationLon(loc),
        this.selectors.accessors.getLocationLat(loc),
      ],
      dims,
      opts,
    );
  }

  async updateLayersData(
    setLayersData: (layersData: LayersData | undefined) => void,
  ) {
    setLayersData(await this.getLayersData());
  }

  getClusterZoom(): number | undefined {
    return this.flowmapState && this.flowmapData
      ? this.selectors.getClusterZoom(this.flowmapState, this.flowmapData)
      : undefined;
  }

  getClusterIndex(): ClusterIndex<F> | undefined {
    return this.flowmapState && this.flowmapData
      ? this.selectors.getClusterIndex(this.flowmapState, this.flowmapData)
      : undefined;
  }

  getLocationsById(): Map<string | number, L> | undefined {
    return this.flowmapState && this.flowmapData
      ? this.selectors.getLocationsById(this.flowmapState, this.flowmapData)
      : undefined;
  }

  getLocationTotals(): Map<string | number, LocationTotals> | undefined {
    return this.flowmapState && this.flowmapData
      ? this.selectors.getLocationTotals(this.flowmapState, this.flowmapData)
      : undefined;
  }

  getFlowsForFlowmapLayer(): Array<F | AggregateFlow> | undefined {
    return this.flowmapState && this.flowmapData
      ? this.selectors.getFlowsForFlowmapLayer(
          this.flowmapState,
          this.flowmapData,
        )
      : undefined;
  }
}
