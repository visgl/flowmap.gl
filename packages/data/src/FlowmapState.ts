/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {LocationFilterMode, ViewportProps} from './types';

export interface FilterState {
  selectedLocations?: (string | number)[];
  locationFilterMode?: LocationFilterMode;
  selectedTimeRange?: [Date, Date];
}

export interface SettingsState {
  animationEnabled: boolean;
  fadeEnabled: boolean;
  fadeOpacityEnabled: boolean;
  locationsEnabled: boolean;
  locationTotalsEnabled: boolean;
  locationLabelsEnabled: boolean;
  adaptiveScalesEnabled: boolean;
  clusteringEnabled: boolean;
  clusteringAuto: boolean;
  clusteringLevel?: number;
  darkMode: boolean;
  fadeAmount: number;
  colorScheme: string | string[] | undefined;
  highlightColor: string;
  maxTopFlowsDisplayNum: number;
}

export interface FlowmapState {
  filter?: FilterState;
  settings: SettingsState;
  viewport: ViewportProps;
}
