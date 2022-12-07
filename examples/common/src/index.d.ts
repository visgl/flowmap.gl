/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import type {GUI} from 'lil-gui';
import {ClusterLevels} from '@flowmap.gl/data';
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

export function getClusterLevelsH3(
  locations: LocationDatum[],
  minZoom?: number,
  maxZoom?: number,
): ClusterLevels;
export function fetchData(clusteringMethod?: string): Promise<LoadedData>;

export const UI_INITIAL: Record<string, any>;
export const initLilGui: (gui: GUI) => void;

export function useUI<T extends Record<string, any>>(
  initialState: T,
  initUi: (gui: GUI) => void,
);
