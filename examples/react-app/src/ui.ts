import {initLilGui, UI_INITIAL} from '@flowmap.gl/examples-common';
import {flightsSourceUrl} from './globe/data';

// The shared GUI binds directly to UI_INITIAL. These controls belong only to
// this example; the other example entry points keep their existing defaults.
export const initialConfig = Object.assign(UI_INITIAL, {
  globe: true,
  basemapLabels: true,
});

export function initExampleGui(gui: Parameters<typeof initLilGui>[0]) {
  gui.add(initialConfig, 'globe');
  gui.add(initialConfig, 'basemapLabels');
  initLilGui(gui);

  const source = document.createElement('a');
  source.href = flightsSourceUrl;
  source.textContent = 'Global flights data';
  source.className = 'example-data-source';
  gui.domElement.append(source);
}
