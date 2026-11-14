import {expect, test} from 'vitest';
import {getFlowHasReverseValues} from '../../packages/data/src/flow-picking';

const flags = (flows) =>
  Array.from(
    getFlowHasReverseValues(
      flows,
      (f) => f[0],
      (f) => f[1],
    ),
  );

test('reverse detection preserves ID types and delimiter-containing IDs', () => {
  expect(
    flags([
      ['a-b', 'c'],
      ['c', 'a-b'],
      ['b-c', 'a'], // Must not collide with a concatenated a-b / c key.
      [1, 'x'],
      ['x', '1'],
      [2, 'y'],
      ['y', 2],
    ]),
  ).toEqual([1, 1, 0, 0, 0, 1, 1]);
});

test('empty lists and self-loops do not create reverse flows', () => {
  expect(flags([])).toEqual([]);
  expect(
    flags([
      ['a', 'a'],
      ['a', 'a'],
      ['a', 'b'],
    ]),
  ).toEqual([0, 0, 0]);
});
