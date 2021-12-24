import {LocationFilterMode, ViewportProps} from './types';

export interface FilterState {
  selectedLocations: string[] | undefined;
  selectedTimeRange: [Date, Date] | undefined;
  locationFilterMode: LocationFilterMode;
}

export interface SettingsState {
  animationEnabled: boolean;
  fadeEnabled: boolean;
  fadeOpacityEnabled: boolean;
  locationTotalsEnabled: boolean;
  adaptiveScalesEnabled: boolean;
  clusteringEnabled: boolean;
  clusteringAuto: boolean;
  clusteringLevel?: number;
  darkMode: boolean;
  fadeAmount: number;
  colorScheme: string | undefined;
  highlightColor: string;
  maxTopFlowsDisplayNum: number;
}

export interface FlowmapState {
  filterState: FilterState;
  settingsState: SettingsState;
  viewport: ViewportProps;
}
