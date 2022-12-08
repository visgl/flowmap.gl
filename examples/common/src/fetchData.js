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

let cachedData;

export default async function fetchData(clusterMethod = 'HCA') {
  if (!cachedData) {
    cachedData = await Promise.all([
      csv(`${path}/locations.csv`, (row, i) => ({
        id: row.id,
        name: row.name,
        lat: Number(row.lat),
        lon: Number(row.lon),
      })),
      csv(`${path}/flows.csv`, (row) => ({
        origin: row.origin,
        dest: row.dest,
        count: Number(row.count),
      })),
    ]).then(([locations, flows]) => ({locations, flows}));
  }
  return {
    ...cachedData,
    ...(clusterMethod === 'H3'
      ? {clusterLevels: getClusterLevelsH3(cachedData.locations)}
      : null),
  };
}
