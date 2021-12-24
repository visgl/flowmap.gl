import type {GUI} from 'lil-gui';
export type LocationDatum = {
  id: string;
  name: string;
  lon: number;
  lat: number;
};
export type FlowDatum = {
  origin: string;
  dest: string;
  count: number;
};
export type LoadedData = {
  locations: LocationDatum[];
  flows: FlowDatum[];
};

export function fetchData(): Promise<LoadedData>;

export const UI_INITIAL: Record<string, any>;
export const initLilGui: (gui: GUI) => void;

export function useUI<T extends Record<string, any>>(
  initialState: T,
  initUi: (gui: GUI) => void,
);
