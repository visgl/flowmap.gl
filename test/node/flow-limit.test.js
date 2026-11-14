import {expect, test} from 'vitest';
import FlowmapSelectors from '../../packages/data/src/FlowmapSelectors';

const selectors = new FlowmapSelectors({
  getFlowOriginId: (flow) => flow.origin,
  getFlowDestId: (flow) => flow.dest,
});
const flows = [
  {origin: 'a', dest: 'a', count: 40},
  {origin: 'a', dest: 'b', count: 30},
  {origin: 'b', dest: 'c', count: 20},
  {origin: 'c', dest: 'a', count: 10},
];

test.each([0, 1, 2, 3, 5])(
  'flow limit %i caps visible non-loop flows',
  (limit) => {
    const selected = selectors.getFlowsForFlowmapLayer.resultFunc(
      flows,
      new Set(['a', 'b', 'c']),
      undefined,
      undefined,
      limit,
      'any',
      undefined,
      undefined,
    );
    expect(selected).toEqual(flows.slice(1, 1 + limit).reverse());
  },
);
