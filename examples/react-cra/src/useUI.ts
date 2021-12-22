import {useEffect, useRef, useState} from 'react';
import GUI from 'lil-gui';

export default function useUI<T extends Record<string, any>>(
  initialState: T,
  uiConfig: (gui: GUI) => void,
) {
  const [state, setState] = useState(initialState);
  const lilGuiRef = useRef<GUI>();
  useEffect(() => {
    const gui = new GUI();
    uiConfig(gui);

    const controllers = gui.controllersRecursive();
    for (const key in initialState) {
      if (initialState.hasOwnProperty(key)) {
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
  }, [initialState, uiConfig]);

  return state;
}
