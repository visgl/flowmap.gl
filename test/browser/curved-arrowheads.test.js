import {_GlobeView as GlobeView, MapView} from '@deck.gl/core';
import {CurvedFlowLinesLayer} from '@flowmap.gl/layers';
import {assert, describe, test} from 'vitest';
import {captureLayers, difference, setupDeck} from './helpers.js';

describe.each(['mercator', 'globe'])('%s curved arrowheads', (projection) => {
  const harness = setupDeck({
    views: projection === 'globe' ? new GlobeView() : new MapView(),
  });

  test.each([0, 20])(
    'short routes preserve the head and shaft proportions (bow=%s)',
    async (bow) => {
      const {deck} = harness;
      for (const zoom of [3, 2, 1, 2, 3]) {
        deck.setProps({viewState: {longitude: 0, latitude: 0, zoom}});
        const render = (thickness) =>
          captureLayers(deck, [
            new CurvedFlowLinesLayer({
              id: 'short-curved-arrow',
              data: [{}],
              drawOutline: false,
              thicknessUnit: 20,
              getThickness: () => thickness,
              getSourcePosition: () => [-2, 0],
              getTargetPosition: () => [2, 0],
              getEndpointOffsets: () => [0, 0],
              getCurveOffset: () => bow,
              getColor: () => [255, 255, 255, 255],
              updateTriggers: {getThickness: thickness},
            }),
          ]);

        // Both widths exceed the space available for the head, even at zoom 3.
        // Fitting the arrow must preserve its silhouette, rather than flatten
        // the head into an increasingly wide shaft as the ratio changes.
        const fitted = await render(1);
        const thicker = await render(2);
        assert(fitted.some((value, i) => i % 4 === 0 && value > 25));
        assert.isAtMost(
          difference(fitted, thicker),
          1,
          `Short-arrow silhouette changed at zoom ${zoom}`,
        );
      }
    },
  );
});
