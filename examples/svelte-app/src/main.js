/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import App from './App.svelte';
import {mount} from 'svelte';

const app = mount(App, {
  target: document.body,
});

export default app;
