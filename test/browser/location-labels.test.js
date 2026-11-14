import {MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {FlowmapLayer} from '@flowmap.gl/layers';
import {assert, test} from 'vitest';
import {setupDeck, captureLayers, difference} from './helpers.js';

const harness = setupDeck({
  viewState: {longitude: 0, latitude: 0, zoom: 2},
});

// Isolate label pixels while retaining the real FlowmapLayer data pipeline.
class LabelsOnlyFlowmapLayer extends FlowmapLayer {
  filterSubLayer(context) {
    return (
      super.filterSubLayer(context) &&
      context.layer.id.includes('location-labels')
    );
  }
}

const makeLayer = (counts, separation = 2, props = {}) =>
  new LabelsOnlyFlowmapLayer({
    id: 'labels',
    data: {
      locations: [
        {id: 'A', lon: -separation / 2, lat: 0},
        {id: 'B', lon: separation / 2, lat: 0},
      ],
      flows: counts.map((count, i) => ({
        origin: i === 0 ? 'A' : 'B',
        dest: i === 0 ? 'A' : 'B',
        count,
      })),
    },
    locationLabelsEnabled: true,
    clusteringEnabled: false,
    adaptiveScalesEnabled: false,
    fadeEnabled: false,
    getLocationId: (d) => d.id,
    getLocationName: (d) => `Location ${d.id}`,
    getLocationLon: (d) => d.lon,
    getLocationLat: (d) => d.lat,
    getFlowOriginId: (d) => d.origin,
    getFlowDestId: (d) => d.dest,
    getFlowMagnitude: (d) => d.count,
    ...props,
  });

test.each([false, true])(
  'larger locations win label collisions and priorities update (globe=%s)',
  async (globe) => {
    const deck = harness.deck;
    const View = globe ? GlobeView : MapView;
    deck.setProps({views: new View({clear: true, clearColor: [0, 0, 0, 255]})});
    const empty = await captureLayers(deck, []);

    // Reverse the size ordering without changing the layer ID or label text.
    for (const counts of [
      [100, 10],
      [10, 100],
    ]) {
      const layer = makeLayer(counts);
      const actual = await captureLayers(deck, [layer]);
      assert(
        difference(empty, actual) > 100,
        'Winning label must remain visible',
      );
      const winner = counts[0] > counts[1] ? 'Location A' : 'Location B';
      const expected = await captureLayers(deck, [
        layer.clone({
          _subLayerProps: {
            'location-labels': {
              collisionEnabled: false,
              getText: (text) => (text === winner ? text : ''),
              updateTriggers: {getText: winner},
            },
          },
        }),
      ]);
      assert(
        difference(actual, expected) <= 1,
        'Only the larger location label should render',
      );
    }
  },
);

test('separated labels remain visible and disabling labels removes them', async () => {
  const deck = harness.deck;
  deck.setProps({
    views: new MapView({clear: true, clearColor: [0, 0, 0, 255]}),
  });
  const empty = await captureLayers(deck, []);
  const layer = makeLayer([100, 10], 40);
  const actual = await captureLayers(deck, [layer]);
  const unfiltered = await captureLayers(deck, [
    layer.clone({
      _subLayerProps: {'location-labels': {collisionEnabled: false}},
    }),
  ]);
  assert(difference(empty, actual) > 100);
  assert(
    difference(actual, unfiltered) <= 1,
    'Separate labels should not be hidden',
  );
  const disabled = await captureLayers(deck, [
    layer.clone({locationLabelsEnabled: false}),
  ]);
  assert.equal(difference(empty, disabled), 0);
});
