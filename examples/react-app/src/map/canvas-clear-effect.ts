import type {Effect} from '@deck.gl/core';

/** Clear once per frame, before drawing any repeated-world subviewports. */
export function createCanvasClearEffect(clearColor: readonly number[]): Effect {
  // Render-pass colors use 0..1; the flowmap canvas helper returns 0..255.
  const color = clearColor.map((value) => value / 255);
  return {
    id: 'canvas-clear',
    props: {},
    useInPicking: false,
    preRender(options) {
      if (!options.isPicking && options.clearCanvas !== false) {
        options.clearColor = color;
      }
    },
    setup() {},
    cleanup() {},
  };
}
