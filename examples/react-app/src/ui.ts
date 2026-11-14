import {initLilGui, UI_INITIAL} from '@flowmap.gl/examples-common';
import {flightsSourceUrl} from './globe/data';

// The shared GUI binds directly to UI_INITIAL. These controls belong only to
// this example; the other example entry points keep their existing defaults.
export const initialConfig = Object.assign(UI_INITIAL, {
  globe: true,
  blendingMode: UI_INITIAL.blendingMode,
  darkMode: UI_INITIAL.darkMode,
  dataset: 'flights',
  canvasRendering: 'auto',
  basemapLabels: true,
});

export function initExampleGui(gui: Parameters<typeof initLilGui>[0]) {
  gui.add(initialConfig, 'globe');
  const dataset = gui.add(initialConfig, 'dataset', ['flights', 'bixi']);
  gui.add(initialConfig, 'canvasRendering', [
    'auto',
    'interleaved',
    'separate',
  ]);
  gui.add(initialConfig, 'basemapLabels');
  initLilGui(gui);

  const source = document.createElement('a');
  const updateSource = (value: string) => {
    source.href =
      value === 'bixi'
        ? 'https://gist.github.com/ilyabo/68d3dba61d86164b940ffe60e9d36931'
        : flightsSourceUrl;
    source.textContent =
      value === 'bixi' ? 'Bixi rides data' : 'Global flights data';
  };
  updateSource(initialConfig.dataset);
  dataset.onChange(updateSource);
  source.className = 'example-data-source';
  gui.domElement.append(source);
}
