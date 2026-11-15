import {initLilGui, UI_INITIAL} from '@flowmap.gl/examples-common';

// The shared GUI binds directly to UI_INITIAL. These controls belong only to
// this example; the other example entry points keep their existing defaults.
export const initialConfig = Object.assign(UI_INITIAL, {
  globe: true,
  blendingMode: UI_INITIAL.blendingMode,
  darkMode: UI_INITIAL.darkMode,
  dataset: 'flights',
  canvasRendering: 'auto',
  basemapLabels: true,
  wrapLongitude: true,
  pickable: true,
});

export function initExampleGui(gui: Parameters<typeof initLilGui>[0]) {
  gui.add(initialConfig, 'globe');
  gui.add(initialConfig, 'dataset', ['flights', 'bixi']);
  gui.add(initialConfig, 'canvasRendering', [
    'auto',
    'interleaved',
    'separate',
  ]);
  gui.add(initialConfig, 'basemapLabels');
  gui.add(initialConfig, 'wrapLongitude');
  gui.add(initialConfig, 'pickable');
  initLilGui(gui);
}
