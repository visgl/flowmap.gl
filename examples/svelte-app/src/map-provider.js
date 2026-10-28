/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import * as maplibregl from 'maplibre-gl';

// Rollup emits the module worker alongside the application bundle.
maplibregl.setWorkerUrl(
  new URL('build/maplibre-gl-worker.mjs', document.baseURI).href,
);

const key = {};

export {maplibregl, key};
