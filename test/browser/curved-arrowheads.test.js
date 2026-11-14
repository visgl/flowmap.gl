import {_GlobeView as GlobeView, MapView} from '@deck.gl/core';
import {CurvedFlowLinesLayer} from '@flowmap.gl/layers';
import {assert, describe, test} from 'vitest';
import {captureLayers, setupDeck} from './helpers.js';

const WIDTH = 480;
const HEIGHT = 360;
const SOURCE_X = 180;
const SOURCE_Y = 180;

function columnWidth(pixels, x) {
  let count = 0;
  for (let y = 0; y < HEIGHT; y++) {
    if (pixels[(y * WIDTH + x) * 4] > 25) count++;
  }
  return count;
}

function peakWidth(pixels) {
  return Math.max(
    ...Array.from({length: WIDTH}, (_, x) => columnWidth(pixels, x)),
  );
}

describe.each(['mercator', 'globe'])('%s curved arrowheads', (projection) => {
  const View = projection === 'globe' ? GlobeView : MapView;
  const harness = setupDeck({
    views: new View({clear: true, clearColor: [0, 0, 0, 255]}),
    viewState: {longitude: 0, latitude: 0, zoom: 5},
  });

  async function renderFlow(length, thickness, endpointOffsets = [0, 0]) {
    const {deck} = harness;
    const viewport = deck.getViewports()[0];
    return captureLayers(deck, [
      new CurvedFlowLinesLayer({
        id: 'curved-arrow',
        data: [{}],
        drawOutline: false,
        thicknessUnit: 20,
        getThickness: () => thickness,
        getSourcePosition: () => viewport.unproject([SOURCE_X, SOURCE_Y]),
        getTargetPosition: () =>
          viewport.unproject([SOURCE_X + length, SOURCE_Y]),
        getEndpointOffsets: () => endpointOffsets,
        getColor: () => [255, 255, 255, 255],
        updateTriggers: {
          getThickness: thickness,
          getTargetPosition: length,
          getEndpointOffsets: endpointOffsets,
        },
      }),
    ]);
  }

  test.each([0.1, 0.2, 0.3])(
    'short and long routes retain magnitude-scaled shaft width: thickness=%s',
    async (thickness) => {
      for (const length of [40, 160]) {
        const pixels = await renderFlow(length, thickness);
        assert.closeTo(columnWidth(pixels, SOURCE_X + 1), thickness * 40, 1);
      }
    },
  );

  test('a shorter, larger-magnitude flow stays thicker than a longer, smaller flow', async () => {
    const short = await renderFlow(40, 0.3);
    const long = await renderFlow(160, 0.2);
    assert.isAbove(
      columnWidth(short, SOURCE_X + 1),
      columnWidth(long, SOURCE_X + 1),
    );
  });

  test('shortening the head preserves its width instead of flattening it into the shaft', async () => {
    for (const length of [160, 80, 40, 80, 160]) {
      const pixels = await renderFlow(length, 0.25);
      // The curved head is 1.7 times the 10px shaft. Its backtrack is capped
      // on the 40px route, but its lateral extent must remain unchanged.
      assert.closeTo(
        peakWidth(pixels),
        17,
        2,
        `Head width at length ${length}`,
      );
      const backtrack = Math.min(44, length * 0.8);
      const midpointX = Math.round(SOURCE_X + length - backtrack / 2);
      assert.closeTo(
        columnWidth(pixels, midpointX),
        8.5,
        2,
        'Head tapers to its tip',
      );
      assert.equal(
        columnWidth(pixels, SOURCE_X - 1),
        0,
        'No overshoot behind source',
      );
      assert.equal(
        columnWidth(pixels, SOURCE_X + length + 1),
        0,
        'No overshoot past tip',
      );
    }
  });

  test('very short, thick routes use the straight-line width cap', async () => {
    const pixels = await renderFlow(10, 0.5);
    assert.closeTo(peakWidth(pixels), 8, 1, 'Width is capped at 80% of length');
    assert.equal(columnWidth(pixels, SOURCE_X - 1), 0);
    assert.equal(columnWidth(pixels, SOURCE_X + 11), 0);
  });

  test('endpoint trimming keeps a short head inside the available route', async () => {
    const pixels = await renderFlow(40, 0.3, [14, 14]);
    assert.isAbove(peakWidth(pixels), 0);
    assert.equal(
      columnWidth(pixels, SOURCE_X + 12),
      0,
      'Head crossed the source trim',
    );
    assert.equal(
      columnWidth(pixels, SOURCE_X + 28),
      0,
      'Head crossed the target trim',
    );
  });
});
