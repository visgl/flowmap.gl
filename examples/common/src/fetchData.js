/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {csv} from 'd3-fetch';
import {getClusterLevelsH3} from './h3-clustering';

const base = 'https://gist.githubusercontent.com/ilyabo/';
const path =
  // Migrations in Switzerland
  // `${base}/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1`;
  // BIXI rides
  `${base}/68d3dba61d86164b940ffe60e9d36931/raw/a72938b5d51b6df9fa7bba9aa1fb7df00cd0f06a`;

const dataByUrl = new Map();

export default async function fetchData(clusterMethod = 'HCA', dataUrl = path) {
  if (!dataByUrl.has(dataUrl)) {
    const pendingData = Promise.all([
      csv(`${dataUrl}/locations.csv`, (row) => ({
        id: row.id,
        name: row.name,
        lat: Number(row.lat),
        lon: Number(row.lon),
      })),
      csv(`${dataUrl}/flows.csv`, (row) => ({
        origin: row.origin,
        dest: row.dest,
        count: Number(row.count),
      })),
    ])
      .then(([locations, flows]) => ({locations, flows}))
      .catch((error) => {
        dataByUrl.delete(dataUrl);
        throw error;
      });
    dataByUrl.set(dataUrl, pendingData);
  }
  const cachedData = await dataByUrl.get(dataUrl);
  return {
    ...cachedData,
    ...(clusterMethod === 'H3'
      ? {clusterLevels: getClusterLevelsH3(cachedData.locations)}
      : null),
  };
}
