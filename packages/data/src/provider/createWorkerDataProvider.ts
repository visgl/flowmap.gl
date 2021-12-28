import * as Comlink from 'comlink';
import WorkerFlowmapDataProvider, {
  WorkerDataProviderProps,
} from './WorkerFlowmapDataProvider';

export default async function createWorkerDataProvider(
  props: WorkerDataProviderProps,
): Promise<WorkerFlowmapDataProvider> {
  const worker = new Worker(
    new URL('./' + 'WorkerFlowmapDataProviderWorker', import.meta.url),
  );
  const WorkerFlowmapDataProvider =
    Comlink.wrap<WorkerFlowmapDataProvider>(worker);
  // @ts-ignore
  const provider = await new WorkerFlowmapDataProvider(props);
  await provider.loadData();
  return provider;
}
