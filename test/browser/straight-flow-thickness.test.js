import {MapView} from '@deck.gl/core';
import {FlowLinesLayer} from '@flowmap.gl/layers';
import {assert, test} from 'vitest';
import {captureLayers, setupDeck} from './helpers.js';

const WIDTH = 480;
const HEIGHT = 360;
const SOURCE_X = 200;
const SOURCE_Y = 180;
const harness = setupDeck({
  views: new MapView({clear: true, clearColor: [0, 0, 0, 255]}),
});

async function renderFlow(length, thickness) {
  const deck = harness.deck;
  const viewport = deck.getViewports()[0];
  return captureLayers(deck, [
    new FlowLinesLayer({
      id: 'straight-flow',
      data: [{}],
      drawOutline: false,
      // The layer doubles this unit, so thickness 0.1 produces a 4px shaft.
      thicknessUnit: 20,
      getThickness: () => thickness,
      getSourcePosition: () => viewport.unproject([SOURCE_X, SOURCE_Y]),
      getTargetPosition: () =>
        viewport.unproject([SOURCE_X + length, SOURCE_Y]),
      getEndpointOffsets: () => [0, 0],
      getColor: () => [255, 255, 255, 255],
      updateTriggers: {
        getThickness: thickness,
        getTargetPosition: length,
      },
    }),
  ]);
}

// Count visible pixels in a screen column, including partially covered edges.
// Keep a one-pixel tolerance for rasterization and the shader's antialiasing.
function columnWidth(pixels, x) {
  let count = 0;
  for (let y = 0; y < HEIGHT; y++) {
    if (pixels[(y * WIDTH + x) * 4] > 25) count++;
  }
  return count;
}

test.each([0.1, 0.2, 0.3])(
  'short and long flows retain magnitude-scaled shaft width: thickness=%s',
  async (thickness) => {
    const expectedWidth = thickness * 40;
    const short = await renderFlow(20, thickness);
    const long = await renderFlow(100, thickness);
    const shortWidth = columnWidth(short, SOURCE_X + 1);
    const longWidth = columnWidth(long, SOURCE_X + 1);
    assert.closeTo(shortWidth, expectedWidth, 1, 'Short-flow shaft width');
    assert.closeTo(longWidth, expectedWidth, 1, 'Long-flow shaft width');
    assert.closeTo(
      shortWidth,
      longWidth,
      1,
      'Length must not shrink the shaft',
    );
  },
);

test.each([
  {length: 30, headBacktrack: 24},
  {length: 100, headBacktrack: 30},
])(
  'arrowhead retains its width and bounded backtrack: length=$length',
  async ({length, headBacktrack}) => {
    const pixels = await renderFlow(length, 0.25);
    const headBaseX = SOURCE_X + length - headBacktrack;
    assert.closeTo(columnWidth(pixels, SOURCE_X + 1), 10, 1, 'Shaft width');
    assert.closeTo(columnWidth(pixels, headBaseX - 1), 10, 1, 'Before head');
    assert.closeTo(columnWidth(pixels, headBaseX), 20, 1, 'Head base width');
    const middleWidth = columnWidth(
      pixels,
      headBaseX + Math.floor(headBacktrack / 2),
    );
    assert.isAbove(middleWidth, 0, 'Head remains visible toward its tip');
    assert.isBelow(middleWidth, 15, 'Head tapers toward its tip');
    assert.equal(
      columnWidth(pixels, SOURCE_X + length),
      0,
      'No overshoot past tip',
    );
    assert.equal(
      columnWidth(pixels, SOURCE_X - 1),
      0,
      'No overshoot behind source',
    );
  },
);

test('very short, thick flows remain bounded by their length', async () => {
  const pixels = await renderFlow(10, 0.5);
  const widths = Array.from({length: WIDTH}, (_, x) => columnWidth(pixels, x));
  assert.closeTo(Math.max(...widths), 8, 1, 'Width is capped at 80% of length');
  assert.equal(widths[SOURCE_X - 1], 0, 'Head does not extend behind source');
  assert.equal(widths[SOURCE_X + 10], 0, 'Flow does not extend past target');
});
