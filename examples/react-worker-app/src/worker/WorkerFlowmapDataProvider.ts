/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Cluster,
  ClusterNode,
  FlowmapData,
  FlowmapDataAccessors,
  FlowmapDataProvider,
  LayersData,
  LocationTotals,
  ViewportProps,
  FlowmapState,
  AggregateFlow,
  LocalFlowmapDataProvider,
} from '@flowmap.gl/data';
import {load} from '@loaders.gl/core';
import {CSVLoader} from '@loaders.gl/csv';

const LOADERS = [CSVLoader];

export type WorkerDataProviderProps = {
  flows: {
    url: string;
    columns: {
      originId: string;
      destId: string;
      count: string;
    };
  };
  locations: {
    url: string;
    columns: {
      id: string;
      name: string;
      lat: string;
      lon: string;
    };
  };
};

export type LocationDatum = Record<string, unknown>;
export type FlowDatum = Record<string, unknown>;

export default class WorkerFlowmapDataProvider
  implements FlowmapDataProvider<LocationDatum, FlowDatum>
{
  private props: WorkerDataProviderProps;
  private localProvider: LocalFlowmapDataProvider<LocationDatum, FlowDatum>;
  private flowmapState: FlowmapState | undefined;

  constructor(props: WorkerDataProviderProps) {
    this.props = props;
    this.localProvider = new LocalFlowmapDataProvider({
      getFlowOriginId: (flow) => flow[props.flows.columns.originId] as string,
      getFlowDestId: (flow) => flow[props.flows.columns.destId] as string,
      getFlowMagnitude: (flow) => flow[props.flows.columns.count] as number,
      // getFlowTime: (flow) => flow.time,
      getLocationLat: (location) =>
        location[props.locations.columns.lat] as number,
      getLocationLon: (location) =>
        location[props.locations.columns.lon] as number,
      getLocationName: (location) =>
        location[props.locations.columns.name] as string,
      getLocationId: (location) =>
        location[props.locations.columns.id] as string,
    });
    this.flowmapState = undefined;
  }

  async loadData() {
    const [locations, flows] = await Promise.all([
      load(this.props.locations.url, LOADERS),
      load(this.props.flows.url, LOADERS),
    ]);
    this.localProvider.setFlowmapData({locations, flows});
  }

  setAccessors(accessors: FlowmapDataAccessors<LocationDatum, FlowDatum>) {
    throw new Error('Not supported');
  }

  async setFlowmapData(
    flowmapData: FlowmapData<LocationDatum, FlowDatum>,
  ): Promise<void> {
    throw new Error('Not supported');
  }

  async setFlowmapState(flowmapState: FlowmapState): Promise<void> {
    await this.localProvider.setFlowmapState(flowmapState);
  }

  async getFlowByIndex(
    idx: number,
  ): Promise<FlowDatum | AggregateFlow | undefined> {
    return this.localProvider.getFlowByIndex(idx);
  }

  async getLocationByIndex(
    idx: number,
  ): Promise<LocationDatum | ClusterNode | undefined> {
    return this.localProvider.getLocationByIndex(idx);
  }

  async getLayersData(): Promise<LayersData | undefined> {
    return await this.localProvider.getLayersData();
  }

  async getLocationById(
    id: string | number,
  ): Promise<LocationDatum | Cluster | undefined> {
    return this.localProvider.getLocationById(id);
  }

  async getTotalsForLocation(
    id: string | number,
  ): Promise<LocationTotals | undefined> {
    return this.localProvider.getTotalsForLocation(id);
  }

  getViewportForLocations(
    dims: [number, number],
  ): Promise<ViewportProps | undefined> {
    return this.localProvider.getViewportForLocations(dims);
  }

  async updateLayersData(
    setLayersData: (layersData: LayersData | undefined) => void,
  ) {
    setLayersData(await this.getLayersData());
  }
}
