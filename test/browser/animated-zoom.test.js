import {MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {FlowmapLayer} from '@flowmap.gl/layers';
import {assert, describe, test, vi} from 'vitest';
import {setupDeck, captureLayers, difference} from './helpers.js';

const makeLayer = (props = {}) =>
  new FlowmapLayer({
    id: 'animated-zoom',
    data: {
      locations: [
        {id: 'a', lon: -40, lat: 0},
        {id: 'b', lon: 40, lat: 0},
      ],
      flows: [{origin: 'a', dest: 'b', count: 100}],
    },
    flowLinesRenderingMode: 'animated-straight',
    clusteringEnabled: false,
    adaptiveScalesEnabled: false,
    fadeEnabled: false,
    locationsEnabled: false,
    colorScheme: ['#ffffff', '#ffffff'],
    getLocationId: (d) => d.id,
    getLocationLon: (d) => d.lon,
    getLocationLat: (d) => d.lat,
    getFlowOriginId: (d) => d.origin,
    getFlowDestId: (d) => d.dest,
    getFlowMagnitude: (d) => d.count,
    ...props,
  });

describe.each([
  ['flat', MapView],
  ['globe', GlobeView],
])('animated zoom (%s)', (_name, View) => {
  const harness = setupDeck({views: new View()});

  test('pulses retain their positions along a route while zooming and panning', async () => {
    const {deck} = harness;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100000);
    const layer = makeLayer();
    const sample = async (zoom, longitude = 0) => {
      deck.setProps({viewState: {longitude, latitude: 0, zoom}});
      const pixels = await captureLayers(deck, [layer.clone()]);
      const viewport = deck.getViewports()[0];
      return Array.from({length: 51}, (_, i) => {
        const [x, y] = viewport.project([-12.5 + i * 0.5, 0]);
        return pixels[((359 - Math.floor(y)) * 480 + Math.floor(x)) * 4];
      });
    };
    const original = await sample(1);
    assert(Math.max(...original) > 100, 'Pulses must be visible');
    const matchingSamples = (values) =>
      values.filter((value, i) => Math.abs(value - original[i]) < 20).length;
    for (const [zoom, longitude] of [
      [1.01, 0],
      [1.5, 0],
      [2, 0],
      [2, 5],
      [1, 0],
    ]) {
      const values = await sample(zoom, longitude);
      // Pixel rounding can move a sample across the sharp end of a pulse.
      assert(
        matchingSamples(values) >= 46,
        `Pulse phase changed at zoom ${zoom}, longitude ${longitude}: ${matchingSamples(values)}/51 samples match`,
      );
    }
    clock.mockReturnValue(101000);
    assert(
      matchingSamples(await sample(1)) < 40,
      'Animation must still advance with time',
    );
  });
});

describe('animation view calibration', () => {
  const harness = setupDeck();

  test('a bound layer calibrates against its rendered view', async () => {
    const {deck} = harness;
    vi.spyOn(Date, 'now').mockReturnValue(100000);
    const detail = new MapView({id: 'detail'});
    const viewState = {
      overview: {longitude: 0, latitude: 0, zoom: 0},
      detail: {longitude: 0, latitude: 0, zoom: 3},
    };
    deck.setProps({views: [detail], viewState});
    const standalone = await captureLayers(deck, [
      makeLayer({viewId: 'detail'}),
    ]);
    deck.setProps({
      views: [new MapView({id: 'overview', height: '50%'}), detail],
      viewState,
    });
    const bound = await captureLayers(deck, [
      makeLayer({id: 'bound-animation', viewId: 'detail'}),
    ]);
    assert(
      difference(standalone, bound) <= 1,
      'Unrelated overview changed pulse spacing',
    );
  });

  test('globe pulses survive the automatic Mercator transition above zoom 12', async () => {
    const {deck} = harness;
    vi.spyOn(Date, 'now').mockReturnValue(100000);
    const layer = makeLayer({
      // GlobeView retains back-face culling when it switches to a flat viewport.
      parameters: {cullMode: 'none'},
      data: {
        locations: [
          {id: 'a', lon: -0.004, lat: 0},
          {id: 'b', lon: 0.004, lat: 0},
        ],
        flows: [{origin: 'a', dest: 'b', count: 100}],
      },
    });
    deck.setProps({views: new GlobeView()});
    const sample = async (zoom) => {
      deck.setProps({viewState: {longitude: 0, latitude: 0, zoom}});
      const live = layer.clone();
      const pixels = await captureLayers(deck, [live]);
      // Average the two central pixels to sample the geographic midpoint.
      return (
        (pixels[(180 * 480 + 239) * 4] + pixels[(180 * 480 + 240) * 4]) / 2
      );
    };
    const before = await sample(12);
    const after = await sample(12.01);
    assert(before > 30, 'Midpoint must lie in a visible pulse');
    assert(
      Math.abs(before - after) < 20,
      `Projection switch shifted pulse phase: ${before} -> ${after}`,
    );
  });
});
