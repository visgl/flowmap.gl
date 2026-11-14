/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Comlink from 'comlink';
import type {FlowmapDataProvider} from '@flowmap.gl/data';
import WorkerFlowmapDataProvider, {
  WorkerDataProviderProps,
  LocationDatum,
  FlowDatum,
} from './WorkerFlowmapDataProvider';

export default async function createWorkerDataProvider(
  props: WorkerDataProviderProps,
  signal?: AbortSignal,
) {
  const worker = new Worker(
    new URL('./WorkerFlowmapDataProviderWorker.ts', import.meta.url),
    {type: 'module'},
  );
  const dispose = () => worker.terminate();
  signal?.addEventListener('abort', dispose, {once: true});
  try {
    const WorkerProvider =
      Comlink.wrap<typeof WorkerFlowmapDataProvider>(worker);
    const provider = await new WorkerProvider(props);
    await provider.loadData();
    const dataProvider: FlowmapDataProvider<LocationDatum, FlowDatum> = {
      setAccessors: provider.setAccessors,
      setFlowmapState: provider.setFlowmapState,
      getFlowByIndex: provider.getFlowByIndex,
      getLocationByIndex: provider.getLocationByIndex,
      getLayersData: provider.getLayersData,
      getLocationById: provider.getLocationById,
      getTotalsForLocation: provider.getTotalsForLocation,
      getViewportForLocations: provider.getViewportForLocations,
      // Keep callbacks on the main thread; functions cannot be cloned to a worker.
      async updateLayersData(setLayersData) {
        setLayersData(await provider.getLayersData());
      },
    };
    return dataProvider;
  } catch (error) {
    dispose();
    throw error;
  }
}
