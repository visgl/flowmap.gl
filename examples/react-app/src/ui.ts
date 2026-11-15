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
  gui.add(initialConfig, 'globe', {globe: true, flat: false});
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

  const linkControls = new Set([
    'globe',
    'dataset',
    'canvasRendering',
    'blendingMode',
    'clusteringMethod',
    'flowEndpointsInViewportMode',
    'flowLinesRenderingMode',
  ]);
  for (const controller of gui.controllersRecursive()) {
    if (linkControls.has(controller.property)) renderChoiceLinks(controller);
  }
}

function renderChoiceLinks(
  controller: ReturnType<Parameters<typeof initLilGui>[0]['add']>,
) {
  const select = controller.$widget.querySelector('select');
  if (!select) throw new Error(`Expected options for ${controller.property}`);

  const choices = document.createElement('fieldset');
  choices.className = 'example-choice-links';
  choices.setAttribute('aria-labelledby', controller.$name.id);
  choices.disabled = controller._disabled;
  const buttons = Array.from(select.options, (option, index) => {
    if (index > 0) {
      const separator = document.createElement('span');
      separator.textContent = '|';
      separator.setAttribute('aria-hidden', 'true');
      choices.append(separator);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = option.textContent;
    button.addEventListener('click', () => {
      select.selectedIndex = index;
      select.dispatchEvent(new Event('change'));
    });
    choices.append(button);
    return button;
  });

  // Retain the controller's change handlers, URL sync, and enabled state.
  const updateDisplay = controller.updateDisplay.bind(controller);
  controller.updateDisplay = () => {
    updateDisplay();
    buttons.forEach((button, index) => {
      button.setAttribute(
        'aria-pressed',
        String(select.selectedIndex === index),
      );
    });
    return controller;
  };
  controller.$disable = choices;
  controller.domElement.classList.add('example-choice-control');
  controller.$widget.replaceChildren(choices);
  controller.updateDisplay();
}
