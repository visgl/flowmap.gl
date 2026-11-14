import {_GlobeViewport as GlobeViewport} from '@deck.gl/core';
import {expect, test, vi} from 'vitest';
import {GlobeAnimationPhase} from '../../packages/layers/src/AnimatedFlowLinesLayer/globe-animation-phase';

const view = (props = {}) =>
  new GlobeViewport({
    id: 'globe',
    width: 480,
    height: 360,
    longitude: 10,
    latitude: 0,
    zoom: 3,
    ...props,
  });
const routes = [
  {source: [-70, 0, 0], target: [70, 0, 0], staggering: 0.2},
  {source: [-45, -20, 0], target: [50, 60, 0], staggering: 0.7},
];
const fract = (x) => x - Math.floor(x);

test('globe zoom preserves phase at the visible anchor with the original surface calibration', () => {
  const history = new GlobeAnimationPhase();
  const before = view();
  const after = view({zoom: 4});
  expect(Array.from(history.get(before, 0, () => routes))).toEqual([0, 0]);
  const offsets = history.get(after, 0, () => routes);
  // At the equator, the first route runs east through the viewport center,
  // 80 degrees from its source. Original phase is surface distance * scale * 15 / width.
  const distance = (256 * 80 * Math.PI) / 180;
  expect(offsets[0]).toBeCloseTo(
    fract((distance * (before.scale - after.scale) * 15) / 480),
    5,
  );
  const returned = history.get(before, 0, () => routes);
  expect(Math.min(returned[0], 1 - returned[0])).toBeLessThan(1e-5);
});

test('pan conventions preserve phase offsets and stationary frames reuse their buffer', () => {
  const history = new GlobeAnimationPhase();
  const readRoutes = vi.fn(() => routes);
  const first = view();
  history.get(first, 0, readRoutes);
  const zoomed = view({zoom: 4});
  const offsets = history.get(zoomed, 0, readRoutes);
  const fixedZoom = view({zoom: 4, latitude: 20, longitude: 30});
  expect(history.get(fixedZoom, 0, readRoutes)).toBe(offsets);
  // Deck compensates raw zoom as latitude changes to hold globe scale fixed.
  const latitude = 40;
  const probe = view({zoom: 4, latitude});
  const fixedScale = view({
    latitude,
    longitude: 40,
    zoom: 4 + Math.log2(fixedZoom.scale / probe.scale),
  });
  expect(history.get(fixedScale, 0, readRoutes)).toBe(offsets);
  expect(history.get(fixedScale, 0, readRoutes)).toBe(offsets);
  expect(readRoutes).toHaveBeenCalledTimes(1);
});

test('route reordering and view interleaving preserve independent histories', () => {
  const history = new GlobeAnimationPhase();
  history.get(view(), 0, () => routes);
  const zoomed = view({zoom: 4});
  const offsets = history.get(zoomed, 0, () => routes);
  const second = view({id: 'second', zoom: 4});
  expect(Array.from(history.get(second, 0, () => routes))).toEqual([0, 0]);
  const reversed = history.get(zoomed, 1, () => [...routes].reverse());
  expect(Array.from(reversed)).toEqual(Array.from(offsets).reverse());
  expect(history.get(second, 0, () => routes)).toEqual(new Float32Array(2));
});

test('degenerate, antipodal and near-polar routes keep finite phase offsets', () => {
  const history = new GlobeAnimationPhase();
  const edgeRoutes = [
    {source: [0, 0, 0], target: [0, 0, 0], staggering: 0},
    {source: [0, 0, 0], target: [180, 0, 0], staggering: 0},
    {source: [0, 89.99, 0], target: [179, 89.99, 0], staggering: 0},
  ];
  history.get(view(), 0, () => edgeRoutes);
  expect(
    Array.from(history.get(view({zoom: 4}), 0, () => edgeRoutes)).every(
      Number.isFinite,
    ),
  ).toBe(true);
});
