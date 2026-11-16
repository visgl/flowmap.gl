import {
  _GlobeView as GlobeView,
  _GlobeViewport as GlobeViewport,
} from '@deck.gl/core';
import {Buffer} from '@luma.gl/core';
import {AnimatedFlowLinesLayer} from '@flowmap.gl/layers';
import {assert, test, vi} from 'vitest';
import {setupDeck, captureLayers, difference} from './helpers.js';

const harness = setupDeck({views: new GlobeView()});
const makeLayer = (props = {}, Layer = AnimatedFlowLinesLayer) =>
  new Layer({
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

test('pitched inset globe keeps an oblique route stable near the view center', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  deck.setProps({
    views: new GlobeView({id: 'inset', x: 36, y: 28, width: 380, height: 280}),
  });
  const layer = makeLayer({
    data: [{source: [-60, -40], target: [60, 40]}],
    getStaggering: () => 0.6,
  });
  let before;
  for (const zoom of [3, 3.1, 4, 5, 3]) {
    deck.setProps({
      viewState: {longitude: 0, latitude: 0, pitch: 40, bearing: 35, zoom},
    });
    const after = await captureLayers(deck, [layer.clone()]);
    // The route crosses the inset's center; sample inside the ribbon, away
    // from antialiased edges. readPixels has a bottom-left origin.
    assert(
      sample(after, 226, 192) > 50,
      'Oblique route must cross the view center',
    );
    before ??= after;
    for (let x = 224; x <= 228; x++) {
      for (let y = 190; y <= 194; y++) {
        assert(
          Math.abs(sample(before, x, y) - sample(after, x, y)) < 12,
          `Inset globe phase shifted at zoom ${zoom}, ${x}/${y}`,
        );
      }
    }
  }
});

// Retain the original source-relative shader as a reference for the surface
// wavelength and time derivative; only the phase origin is allowed to change.
class SourceAnchoredLayer extends AnimatedFlowLinesLayer {
  static componentName = 'SourceAnchoredLayer';
  getShaders() {
    const shaders = super.getShaders();
    return {
      ...shaders,
      vs: shaders.vs.replace('(positions.x - globeAnchor)', 'positions.x'),
    };
  }
}

test('globe anchor preserves surface spacing and speed across zoom and pan', async () => {
  const {deck} = harness;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeLayer();
  for (const zoom of [3, 4]) {
    for (const longitude of [10, 15, -5]) {
      const state = {longitude, latitude: 0, zoom};
      deck.setProps({viewState: state});
      clock.mockReturnValue(101000);
      const actual = await captureLayers(deck, [layer.clone()]);
      // This equatorial route crosses the view center longitude. Its distance
      // from the source is known analytically, in globe common units (R=256).
      const viewport = new GlobeViewport({...state, width: 480, height: 360});
      const distance = (256 * (longitude + 70) * Math.PI) / 180;
      const anchorPhase = (distance * viewport.scale * 15) / 480;
      clock.mockReturnValue(100000);
      const reference = makeLayer(
        {
          id: 'surface-reference',
          // One second still advances exactly 0.3 cycles.
          getStaggering: () => 0.8 - anchorPhase - 0.3,
        },
        SourceAnchoredLayer,
      );
      const expected = await captureLayers(deck, [reference]);
      // Tiny GPU/CPU angle differences can move a discontinuous head across
      // one pixel. Compare the smooth tails across the entire center row.
      const smooth = [];
      for (let x = 1; x < 479; x++) {
        if (
          Math.abs(sample(actual, x - 1) - sample(actual, x + 1)) > 100 ||
          Math.abs(sample(expected, x - 1) - sample(expected, x + 1)) > 100
        )
          continue;
        smooth.push(Math.abs(sample(actual, x) - sample(expected, x)));
      }
      assert(
        Math.max(...smooth) <= 5,
        `Surface spacing or speed changed at ${longitude}/${zoom}: ${Math.max(...smooth)}`,
      );
    }
  }
});

test('globe pan keeps the phase near the view center instead of following geography', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeLayer();
  deck.setProps({viewState: {longitude: 10, latitude: 0, zoom: 4}});
  const before = await captureLayers(deck, [layer]);
  for (const longitude of [15, -5, 10]) {
    deck.setProps({viewState: {longitude, latitude: 0, zoom: 4}});
    const after = await captureLayers(deck, [layer.clone()]);
    for (let x = 230; x < 250; x++) {
      assert(
        Math.abs(sample(before, x) - sample(after, x)) <= 2,
        'Panning shifted the center phase',
      );
    }
  }
});

test('GPU-only positions share the globe anchor across zoom without readback', async () => {
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
    for (const zoom of [3, 4, 5, 3]) {
      deck.setProps({viewState: {longitude: 10, latitude: 0, zoom}});
      const actual = await captureLayers(deck, [gpu.clone()]);
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
    }
  } finally {
    await captureLayers(deck, []);
    buffers.forEach((buffer) => buffer.destroy());
  }
});
