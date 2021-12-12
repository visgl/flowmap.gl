import {useEffect, useRef, useState} from 'react';
import GUI, {Controller} from 'lil-gui';

export default function useUI<T extends Record<string, any>>(
  initialState: T,
  uiParams?: Record<string, Array<any> | ((c: Controller, gui: GUI) => void)>,
  // onInit?: (gui: GUI) => void,
) {
  const [state, setState] = useState(initialState);
  const lilGuiRef = useRef<GUI>();
  useEffect(() => {
    const gui = new GUI();
    for (const key in initialState) {
      if (initialState.hasOwnProperty(key)) {
        const pp = uiParams?.[key];
        let args = [initialState, key];
        if (Array.isArray(pp)) {
          args = [...args, ...pp];
        }
        // @ts-ignore
        const controller = gui.add.apply(gui, args);
        if (typeof pp === 'function') {
          pp(controller, gui);
        }
      }
    }

    gui.onChange((event) => {
      setState((state) => ({
        ...state,
        [event.property]: event.value,
      }));
    });

    // if (onInit) {
    //   onInit(gui);
    // }

    lilGuiRef.current = gui;
    return () => {
      gui.destroy();
    };
  }, [initialState, uiParams]);

  return state;
}
