import {Deck} from '@deck.gl/core';
import {afterEach, assert, beforeEach, vi} from 'vitest';

// Each test owns its canvas, Deck instance, rendering errors, and clock mocks.
export function setupDeck(props) {
  let deck;
  let parent;
  let errors;

  beforeEach(async () => {
    errors = [];
    parent = globalThis.document.createElement('div');
    globalThis.document.body.append(parent);
    await new Promise((resolve, reject) => {
      deck = new Deck({
        parent,
        width: 480,
        height: 360,
        useDevicePixels: false,
        viewState: {longitude: 0, latitude: 0, zoom: 1},
        controller: false,
        ...props,
        onLoad: resolve,
        onError: (error) => {
          errors.push(error.message);
          reject(error);
        },
      });
    });
  });

  afterEach(() => {
    try {
      deck?.finalize();
      assert.deepEqual(errors, [], 'Deck reported rendering errors');
    } finally {
      parent?.remove();
      deck = undefined;
      vi.restoreAllMocks();
    }
  });

  return {
    get deck() {
      return deck;
    },
  };
}

export async function frames() {
  // Preserve the existing settling period for asynchronous data-provider updates.
  for (let i = 0; i < 8; i++) {
    await new Promise(globalThis.requestAnimationFrame);
  }
}

export async function captureLayers(deck, layers) {
  deck.setProps({layers});
  await frames();
  deck.redraw('capture');
  const gl = deck.getCanvas().getContext('webgl2');
  assert(gl, 'WebGL2 is required for rendering tests');
  const pixels = new Uint8Array(
    gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
  );
  gl.readPixels(
    0,
    0,
    gl.drawingBufferWidth,
    gl.drawingBufferHeight,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );
  return pixels;
}

export const difference = (a, b) =>
  a.reduce((max, value, i) => Math.max(max, Math.abs(value - b[i])), 0);
