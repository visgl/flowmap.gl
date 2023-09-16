/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'


// import {createWorkerDataProvider, LocationFilterMode} from '@flowmap.gl/data';
// import {FlowmapLayer} from '@flowmap.gl/layers';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// (async () => {
//   const base = 'https://gist.githubusercontent.com/ilyabo/';
//   const path =
//     // Migrations in Switzerland
//     // `${base}/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1`;
//     // BIXI rides
//     `${base}/68d3dba61d86164b940ffe60e9d36931/raw/a72938b5d51b6df9fa7bba9aa1fb7df00cd0f06a`;
//   const dataProvider = await createWorkerDataProvider({
//     flows: {
//       url: `${path}/flows.csv`,
//       columns: {
//         originId: 'origin',
//         destId: 'dest',
//         count: 'count',
//       },
//     },
//     locations: {
//       url: `${path}/locations.csv`,
//       columns: {
//         id: 'id',
//         name: 'name',
//         lat: 'lat',
//         lon: 'lon',
//       },
//     },
//   });
//
//   const viewport = await dataProvider.getViewportForLocations([
//     window.innerWidth,
//     window.innerHeight,
//   ]);
//
//   if (viewport) {
//     await dataProvider.setFlowmapState({
//       viewport,
//       filter: {
//         selectedLocations: undefined,
//         locationFilterMode: LocationFilterMode.ALL,
//         selectedTimeRange: undefined,
//       },
//       settings: {
//         ...FlowmapLayer.defaultProps,
//       },
//     });
//     console.log(await dataProvider.getLayersData());
//   }
// })();
