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
  const controllersRef = useRef([]);

  const syncToUrl = useCallback(
    (nextState) => writeParamsToUrl(nextState, defaultsRef.current),
    [],
  );

  const updateStateValue = useCallback((property, value) => {
    setState((prev) => {
      const next = {...prev, [property]: value};
      writeParamsToUrl(next, defaultsRef.current);
      return next;
    });
  }, []);

  const setValue = useCallback(
    (property, value) => {
      const controller = controllersRef.current.find(
        (c) => c._name === property,
      );
      if (controller) {
        controller.setValue(value);
      } else {
        updateStateValue(property, value);
      }
    },
    [updateStateValue],
  );

  useEffect(() => {
    const merged = {...initialState, ...readParamsFromUrl(initialState)};

    Object.assign(initialState, merged);

    const gui = new GUI();
    initUi(gui);

    let controllers = gui.controllersRecursive();
    for (const key in initialState) {
      if (initialState[key]) {
        if (controllers.find((c) => c._name === key)) continue;
        const args = [initialState, key];
        // @ts-ignore
        gui.add.apply(gui, args);
      }
    }
    controllers = gui.controllersRecursive();
    controllersRef.current = controllers;

    gui.onChange((event) => {
      updateStateValue(event.property, event.value);
    });

    lilGuiRef.current = gui;
    return () => {
      gui.destroy();
      controllersRef.current = [];
    };
  }, [initUi, updateStateValue]);

  useEffect(() => {
    syncToUrl(state);
  }, [state, syncToUrl]);

  return [state, setValue];
}
