import {
  _GlobeView as GlobeView,
  _GlobeViewport as GlobeViewport,
} from '@deck.gl/core';
import {Buffer} from '@luma.gl/core';
import {AnimatedFlowLinesLayer} from '@flowmap.gl/layers';
import {assert, test, vi} from 'vitest';
import {setupDeck, captureLayers, difference} from './helpers.js';

const harness = setupDeck({views: new GlobeView()});
const makeLayer = (props = {}) =>
  new AnimatedFlowLinesLayer({
    id: 'globe-animation',
    data: [{source: [-70, 0], target: [70, 0]}],
    getSourcePosition: (d) => d.source,
    getTargetPosition: (d) => d.target,
    getColor: () => [255, 255, 255, 255],
    getStaggering: () => 0.8,
    numSegments: 96,
    parameters: {
      cullMode: 'none',
      depthCompare: 'always',
      depthWriteEnabled: false,
    },
    ...props,
  });
const sample = (pixels, x = 240, y = 180) => pixels[(y * 480 + x) * 4];

test.each(
  [false, true].flatMap((cursorZoom) =>
    [false, true].map((binary) => ({cursorZoom, binary})),
  ),
)(
  'globe zoom preserves visible phase (cursor=$cursorZoom binary=$binary)',
  async ({cursorZoom, binary}) => {
    const {deck} = harness;
    vi.spyOn(Date, 'now').mockReturnValue(100000);
    const initial = {
      width: 480,
      height: 360,
      longitude: 10,
      latitude: 0,
      zoom: 3,
    };
    deck.setProps({viewState: initial});
    const layer = makeLayer(
      binary
        ? {
            data: {
              length: 1,
              attributes: {
                getSourcePosition: {
                  value: new Float64Array([-70, 0, 0]),
                  size: 3,
                },
                getTargetPosition: {
                  value: new Float64Array([70, 0, 0]),
                  size: 3,
                },
                getStaggering: {value: new Float32Array([0.8]), size: 1},
              },
            },
          }
        : {},
    );
    const original = await captureLayers(deck, [layer]);
    const row = Array.from({length: 480}, (_, x) => sample(original, x));
    assert(
      Math.max(...row) > 100,
      `Globe route not visible on center row: max=${Math.max(...row)}, whole=${original.some((v) => v > 100)}`,
    );
    const cursor = [180, 180];
    const anchor = new GlobeViewport(initial).unproject(cursor);
    for (const zoom of [3.01, 3.1, 3.5, 4, 5, 4, 3]) {
      const viewport = new GlobeViewport({...initial, zoom});
      const center = cursorZoom
        ? viewport.panByPosition(anchor, cursor)
        : initial;
      deck.setProps({viewState: {...center, zoom}});
      const after = await captureLayers(deck, [layer.clone()]);
      for (let x = 230; x < 250; x++) {
        // A subpixel change in curvature can move the discontinuous pulse head
        // across a pixel. Compare the smooth tails, away from that boundary.
        if (
          Math.abs(sample(original, x - 1) - sample(original, x + 1)) > 100 ||
          Math.abs(sample(after, x - 1) - sample(after, x + 1)) > 100
        )
          continue;
        assert(
          Math.abs(sample(original, x) - sample(after, x)) < 12,
          `Zoom ${zoom}: globe phase shifted at ${x}: ${sample(original, x)} -> ${sample(after, x)}`,
        );
      }
    }
  },
);

test('globe phase correction preserves surface spacing, speed, and panning', async () => {
  const {deck} = harness;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100000);
  deck.setProps({viewState: {longitude: 10, latitude: 0, zoom: 3}});
  const layer = makeLayer();
  await captureLayers(deck, [layer]);
  deck.setProps({viewState: {longitude: 10, latitude: 0, zoom: 4}});
  await captureLayers(deck, [layer.clone()]);
  const live = deck.props.layers[0];
  const offset = live.state.globePhaseValues[0];
  assert(offset > 0.01, 'This test needs a nonzero zoom correction');
  for (const longitude of [10, 15, -5]) {
    deck.setProps({viewState: {longitude, latitude: 0, zoom: 4}});
    clock.mockReturnValue(101000);
    const actual = await captureLayers(deck, [live.clone({visible: true})]);
    // A fresh layer has the original source-relative surface formula. Adding
    // the retained offset to staggering must reproduce every pulse, including
    // perspective/foreshortening. One second advances exactly 0.3 cycles.
    clock.mockReturnValue(100000);
    const reference = makeLayer({
      id: 'surface-reference',
      getStaggering: () => 0.8 + offset - 0.3,
    });
    const expected = await captureLayers(deck, [
      live.clone({visible: false}),
      reference,
    ]);
    assert(
      difference(actual, expected) <= 2,
      'Surface spacing, speed or pan behavior changed',
    );
  }
});

test('GPU-only positions retain legacy globe rendering without readback', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  deck.setProps({viewState: {longitude: 10, latitude: 0, zoom: 3}});
  const buffers = [
    deck.device.createBuffer({
      data: new Float32Array([-70, 0, 0]),
      usage: Buffer.VERTEX | Buffer.COPY_DST,
    }),
    deck.device.createBuffer({
      data: new Float32Array([70, 0, 0]),
      usage: Buffer.VERTEX | Buffer.COPY_DST,
    }),
  ];
  try {
    const gpu = makeLayer({
      data: {
        length: 1,
        attributes: {
          getSourcePosition: {buffer: buffers[0], size: 3},
          getTargetPosition: {buffer: buffers[1], size: 3},
        },
      },
    });
    const actual = await captureLayers(deck, [gpu]);
    assert(
      Array.from({length: 480}, (_, x) => sample(actual, x)).some(
        (value) => value > 100,
      ),
      'GPU-backed route must be visible',
    );
    const expected = await captureLayers(deck, [
      makeLayer({id: 'cpu-reference'}),
    ]);
    assert(difference(actual, expected) <= 2, 'GPU-only rendering changed');
  } finally {
    await captureLayers(deck, []);
    buffers.forEach((buffer) => buffer.destroy());
  }
});
