import {findAppropriateZoomLevel} from '@flowmap.gl/data';
import {expect, test} from 'vitest';

test.each([-1, 0, 1, 4, 20])(
  'cluster selection ignores floating-point jitter around zoom %s',
  (zoom) => {
    const levels = [zoom - 1, zoom, zoom + 1];
    for (const target of [zoom - 2e-15, zoom, zoom + 3e-15]) {
      expect(findAppropriateZoomLevel(levels, target)).toBe(zoom);
    }
  },
);

test.each([-1, 0, 1, 4, 20])(
  'cluster selection preserves fractional zoom transitions around %s',
  (zoom) => {
    const levels = [zoom - 1, zoom, zoom + 1];
    for (const offset of [1e-8, 0.01, 0.5]) {
      expect(findAppropriateZoomLevel(levels, zoom - offset)).toBe(zoom - 1);
      expect(findAppropriateZoomLevel(levels, zoom + offset)).toBe(zoom);
    }
  },
);

test('reported Google Maps zoom sequence keeps the same cluster level', () => {
  const levels = [0, 1, 2, 3, 4, 5];
  const zooms = [4, 4.000000000000003, 3.999999999999998, 4];
  expect(zooms.map((zoom) => findAppropriateZoomLevel(levels, zoom))).toEqual([
    4, 4, 4, 4,
  ]);
});

test('sparse levels keep their existing selection and clamping behavior', () => {
  const levels = [0, 3, 5];
  for (const target of [3.999999999999998, 4, 4.000000000000003]) {
    expect(findAppropriateZoomLevel(levels, target)).toBe(5);
  }
  expect(findAppropriateZoomLevel(levels, 3.5)).toBe(3);
  expect(findAppropriateZoomLevel(levels, -2)).toBe(0);
  expect(findAppropriateZoomLevel(levels, 30)).toBe(5);
  expect(findAppropriateZoomLevel([4], 0)).toBe(4);
  expect(() => findAppropriateZoomLevel([], 4)).toThrow(
    'No available zoom levels',
  );
});
