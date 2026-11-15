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
  addChoiceLinks(gui, 'globe', 'Projection', [
    ['globe', true],
    ['flat', false],
  ]);
  addChoiceLinks(gui, 'dataset', 'Dataset', [
    ['flights', 'flights'],
    ['bixi', 'bixi'],
  ]);
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

function addChoiceLinks<K extends 'globe' | 'dataset'>(
  gui: Parameters<typeof initLilGui>[0],
  property: K,
  label: string,
  choices: [string, (typeof initialConfig)[K]][],
) {
  // Keep a controller registered so the shared hook handles state and URL sync.
  const controller = gui.add(initialConfig, property).hide();
  const row = document.createElement('div');
  row.className = 'example-choice-links';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', label);
  const buttons = choices.map(([text, value], index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.textContent = '|';
      separator.setAttribute('aria-hidden', 'true');
      row.append(separator);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = text;
    button.addEventListener('click', () => controller.setValue(value));
    row.append(button);
    return button;
  });
  const updateSelection = () => {
    buttons.forEach((button, index) => {
      button.setAttribute(
        'aria-pressed',
        String(initialConfig[property] === choices[index][1]),
      );
    });
  };
  controller.onChange(updateSelection);
  updateSelection();
  gui.$children.append(row);
}
