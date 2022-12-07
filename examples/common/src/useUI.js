/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {useEffect, useRef, useState} from 'react';
import GUI from 'lil-gui';

export default function useUI(initialState, initUi) {
  const [state, setState] = useState(initialState);
  const lilGuiRef = useRef();
  useEffect(() => {
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
      setState((state) => ({
        ...state,
        [event.property]: event.value,
      }));
    });

    lilGuiRef.current = gui;
    return () => {
      gui.destroy();
    };
  }, [initialState, initUi]);

  return state;
}
