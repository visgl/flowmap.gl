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

const countColor = (pixels, predicate) => {
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (predicate(pixels[i], pixels[i + 1], pixels[i + 2])) count++;
  }
  return count;
};

test.each([45, 90])(
  'isolated offset labels remain visible at %s degrees',
  async (angle) => {
    const deck = harness.deck;
    deck.setProps({
      views: new MapView({clear: true, clearColor: [0, 0, 0, 255]}),
    });
    const empty = await captureLayers(deck, []);
    const style = {
      getText: (name) => name.slice(-1),
      getSize: 18,
      getAngle: angle,
      getPixelOffset: [0, 60],
    };
    const layer = makeLayer([100, 10], 40, {locationLabelProps: style});
    const actual = await captureLayers(deck, [layer]);
    const unfiltered = await captureLayers(deck, [
      layer.clone({
        locationLabelProps: {
          ...style,
          collisionEnabled: false,
        },
      }),
    ]);
    assert(
      difference(empty, actual) > 100,
      'Offset rotated labels must remain visible',
    );
    assert(
      difference(actual, unfiltered) <= 1,
      'An isolated label should not collide with itself',
    );
  },
);

test('label props customize text, color and outlines and update without new data', async () => {
  const deck = harness.deck;
  deck.setProps({
    views: new MapView({clear: true, clearColor: [0, 0, 0, 255]}),
  });
  const style = {
    getColor: [255, 0, 0, 255],
    getSize: 24,
    outlineColor: [0, 0, 255, 255],
    outlineWidth: 3,
  };
  const layer = makeLayer([100, 10], 40, {locationLabelProps: style});
  const original = await captureLayers(deck, [layer]);
  const red = (r, g, b) => r > 100 && g < 10 && b < 10;
  const blue = (r, g, b) => b > 100 && r < 10 && g < 10;
  assert(countColor(original, red) > 100, 'Custom text color is missing');
  assert(
    countColor(original, blue) > 100,
    'Outline should enable SDF and render',
  );

  const shortened = layer.clone({
    locationLabelProps: {
      ...style,
      getText: (name) => name.slice(-1),
    },
  });
  const shortPixels = await captureLayers(deck, [shortened]);
  assert(
    countColor(shortPixels, red) > 20,
    'Short labels should remain visible',
  );
  assert(
    countColor(shortPixels, red) < countColor(original, red) / 2,
    'Replacing getText should shorten labels without replacing the data',
  );

  const noOutline = await captureLayers(deck, [
    shortened.clone({
      locationLabelProps: {
        ...shortened.props.locationLabelProps,
        outlineWidth: 0,
      },
    }),
  ]);
  assert.equal(
    countColor(noOutline, blue),
    0,
    'Disabling outlines should update',
  );

  let suffix = 'A';
  const getText = (name) => (name.endsWith(suffix) ? name : '');
  const withTrigger = (trigger) =>
    layer.clone({
      locationLabelProps: {
        ...style,
        getText,
        updateTriggers: {getText: trigger},
      },
    });
  const first = await captureLayers(deck, [withTrigger(suffix)]);
  suffix = 'B';
  const second = await captureLayers(deck, [withTrigger(suffix)]);
  assert(
    difference(first, second) > 100,
    'Custom updateTriggers should refresh text',
  );
});

test.each([false, true])(
  'custom backgrounds and offsets retain collision priority (globe=%s)',
  async (globe) => {
    const deck = harness.deck;
    const View = globe ? GlobeView : MapView;
    deck.setProps({views: new View({clear: true, clearColor: [0, 0, 0, 255]})});
    const style = {
      getColor: [255, 0, 0, 255],
      getSize: 16,
      sizeScale: 1.5,
      getPixelOffset: [0, -60],
      getAlignmentBaseline: 'bottom',
      background: true,
      getBackgroundColor: [0, 200, 0, 255],
      backgroundPadding: [6, 4],
      backgroundBorderRadius: 3,
    };
    const layer = makeLayer([100, 10], 2, {locationLabelProps: style});
    const actual = await captureLayers(deck, [layer]);
    assert(
      countColor(actual, (r, g, b) => g > 150 && r < 10 && b < 10) > 100,
      'The requested background should be visible',
    );
    const expected = await captureLayers(deck, [
      layer.clone({
        locationLabelProps: {
          ...style,
          collisionEnabled: false,
          getText: (name) => (name === 'Location A' ? name : ''),
        },
      }),
    ]);
    assert(
      difference(actual, expected) <= 1,
      'Custom styling must keep the larger label',
    );
    const both = await captureLayers(deck, [
      layer.clone({
        locationLabelProps: {
          ...style,
          collisionEnabled: false,
        },
      }),
    ]);
    assert(
      difference(actual, both) > 100,
      'collisionEnabled must be forwarded',
    );
  },
);
