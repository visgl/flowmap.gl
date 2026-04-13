/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import GUI from 'lil-gui';

function parseUrlParam(value, defaultValue) {
  if (value === null) return undefined;
  if (typeof defaultValue === 'boolean') return value === 'true';
  if (typeof defaultValue === 'number') return Number(value);
  return value;
}

function readParamsFromUrl(defaults) {
  const params = new URLSearchParams(window.location.search);
  const overrides = {};
  for (const key in defaults) {
    const parsed = parseUrlParam(params.get(key), defaults[key]);
    if (parsed !== undefined) overrides[key] = parsed;
  }
  return overrides;
}

function writeParamsToUrl(state, defaults) {
  const params = new URLSearchParams();
  for (const key in state) {
    if (state[key] !== defaults[key]) {
      params.set(key, String(state[key]));
    }
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

export default function useUI(initialState, initUi) {
  const defaultsRef = useRef({...initialState});
  const [state, setState] = useState(() => ({
    ...initialState,
    ...readParamsFromUrl(initialState),
  }));
  const lilGuiRef = useRef();

  const syncToUrl = useCallback(
    (nextState) => writeParamsToUrl(nextState, defaultsRef.current),
    [],
  );

  useEffect(() => {
    const merged = {...initialState, ...readParamsFromUrl(initialState)};

    Object.assign(initialState, merged);

    const gui = new GUI();
    initUi(gui);

    const controllers = gui.controllersRecursive();
    for (const key in initialState) {
      if (initialState[key]) {
        if (controllers.find((c) => c._name === key)) continue;
        const args = [initialState, key];
        // @ts-ignore
        gui.add.apply(gui, args);
      }
    }

    gui.onChange((event) => {
      setState((prev) => {
        const next = {...prev, [event.property]: event.value};
        writeParamsToUrl(next, defaultsRef.current);
        return next;
      });
    });

    lilGuiRef.current = gui;
    return () => {
      gui.destroy();
    };
  }, [initUi]);

  useEffect(() => {
    syncToUrl(state);
  }, [state, syncToUrl]);

  return state;
}
