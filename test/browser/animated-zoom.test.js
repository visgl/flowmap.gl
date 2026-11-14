import {MapView, WebMercatorViewport} from '@deck.gl/core';
import {FlowmapLayer, AnimatedFlowLinesLayer} from '@flowmap.gl/layers';
import {assert, test, vi} from 'vitest';
import {setupDeck, captureLayers, difference} from './helpers.js';

const makeLayer = (props = {}) =>
  new FlowmapLayer({
    id: 'animated-zoom',
    data: {
      locations: [
        {id: 'a', lon: -15, lat: 0},
        {id: 'b', lon: 15, lat: 0},
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

// Use the primitive for crossing routes whose endpoints are both offscreen;
// the composite layer's endpoint filtering is independent of animation.
const makeAnimatedLayer = (source = [-80, 0], target = [80, 0]) =>
  new AnimatedFlowLinesLayer({
    id: 'screen-animation',
    data: [{source, target}],
    drawOutline: false,
    getSourcePosition: (d) => d.source,
    getTargetPosition: (d) => d.target,
    getStaggering: () => 0.37,
    getColor: () => [255, 255, 255, 255],
  });

const row = (pixels) =>
  Array.from({length: 480}, (_, x) => pixels[(180 * 480 + x) * 4]);
const assertShift = (before, after, shift = 0) => {
  for (let x = 140; x < 230; x++) {
    assert(
      Math.abs(before[x] - after[x + shift]) <= 2,
      `Pulse shifted unexpectedly at pixel ${x}: ${before[x]} -> ${after[x + shift]}`,
    );
  }
};

const harness = setupDeck();

test('zoom retains pixel spacing, speed and phase, including with offscreen origins', async () => {
  const {deck} = harness;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeAnimatedLayer();
  let original;
  for (const zoom of [1, 1.01, 1.5, 2, 4, 12, 16, 18, 18.01, 20, 1]) {
    deck.setProps({viewState: {longitude: 0, latitude: 0, zoom}});
    clock.mockReturnValue(100000);
    const live = layer.clone();
    const still = row(await captureLayers(deck, [live]));
    assert(Math.max(...still.slice(160, 300)) > 100, 'Pulses must be visible');
    if (original) assertShift(original, still);
    original ??= still;
    assertShift(still, still, 60);
    clock.mockReturnValue(101000);
    assertShift(still, row(await captureLayers(deck, [layer.clone()])), 18);
  }
});

test('panning follows the map between zoom gestures', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeAnimatedLayer();
  deck.setProps({viewState: {longitude: 0, latitude: 0, zoom: 3}});
  let before = row(await captureLayers(deck, [layer]));
  assert(Math.max(...before) > 100, 'Panned route must be visible');
  let longitude = 0;
  let previousZoom = 3;
  for (const zoom of [3, 4, 4, 3, 3 + 1e-15]) {
    longitude += (360 * 30) / (512 * 2 ** zoom);
    deck.setProps({viewState: {longitude, latitude: 0, zoom}});
    const after = row(await captureLayers(deck, [layer.clone()]));
    assertShift(before, after, Math.abs(zoom - previousZoom) < 1e-9 ? -30 : 0);
    assertShift(after, after, 60);
    before = after;
    previousZoom = zoom;
  }
});

test('pitched routes retain uniform screen spacing and speed', async () => {
  const {deck} = harness;
  const clock = vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeAnimatedLayer([0, -30], [0, 30]);
  const column = (pixels) =>
    Array.from({length: 360}, (_, y) => pixels[(y * 480 + 240) * 4]);
  let original;
  for (const zoom of [2, 2.5, 3]) {
    deck.setProps({viewState: {longitude: 0, latitude: 0, zoom, pitch: 35}});
    clock.mockReturnValue(100000);
    const still = column(await captureLayers(deck, [layer.clone()]));
    assert(Math.max(...still.slice(160, 300)) > 100, 'Pulses must be visible');
    if (original) assertShift(original, still);
    original ??= still;
    assertShift(still, still, 60);
    clock.mockReturnValue(101000);
    assertShift(still, column(await captureLayers(deck, [layer.clone()])), 18);
  }
});

test('bound views and repeated drawing passes do not alter animation phase', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  const detail = new MapView({id: 'detail'});
  const viewState = {
    overview: {longitude: 40, latitude: 0, zoom: 0},
    detail: {longitude: 0, latitude: 0, zoom: 3},
  };
  deck.setProps({views: [detail], viewState});
  const standalone = await captureLayers(deck, [makeLayer({viewId: 'detail'})]);
  deck.setProps({
    views: [new MapView({id: 'overview', height: '50%'}), detail],
    viewState,
  });
  const layer = makeLayer({
    id: 'bound-animation',
    viewId: 'detail',
    pickable: true,
  });
  const bound = await captureLayers(deck, [layer]);
  assert(
    bound.some((value, i) => i % 4 !== 3 && value > 100),
    'Bound route must be visible',
  );
  assert(
    difference(standalone, bound) <= 1,
    'Unrelated view changed pulse spacing',
  );
  deck.pickObject({x: 240, y: 180});
  assert(
    difference(bound, await captureLayers(deck, [layer.clone()])) <= 1,
    'Picking advanced pan compensation',
  );
});

test('wrapped halves meet without a phase seam and dateline pans stay continuous', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeLayer({
    wrapLongitude: true,
    data: {
      locations: [
        {id: 'a', lon: 165, lat: 0},
        {id: 'b', lon: -165, lat: 0},
      ],
      flows: [{origin: 'a', dest: 'b', count: 100}],
    },
  });
  deck.setProps({
    views: new MapView({repeat: true}),
    viewState: {longitude: 180, latitude: 0, zoom: 3},
  });
  const before = row(await captureLayers(deck, [layer]));
  assert(Math.max(...before) > 100, 'Wrapped route must be visible');
  assertShift(before, before, 60);
  const longitude = -180 + (360 * 30) / (512 * 2 ** 3);
  deck.setProps({viewState: {longitude, latitude: 0, zoom: 3}});
  const after = row(await captureLayers(deck, [layer.clone()]));
  assertShift(before, after, -30);
});

test('pixel spacing uses CSS pixels and each viewport origin', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeAnimatedLayer();
  const original = row(await captureLayers(deck, [layer]));
  deck.setProps({
    views: new MapView({id: 'inset', x: 120, y: 40, width: 320, height: 240}),
  });
  const inset = await captureLayers(deck, [layer.clone()]);
  const insetRow = Array.from(
    {length: 480},
    (_, x) => inset[(200 * 480 + x) * 4],
  );
  assertShift(original, insetRow, 40);

  deck.setProps({views: new MapView(), useDevicePixels: 2});
  const retina = await captureLayers(deck, [layer.clone()]);
  assert.equal(retina.length, 960 * 720 * 4);
  const cssRow = Array.from(
    {length: 480},
    (_, x) =>
      (retina[(360 * 960 + x * 2) * 4] + retina[(360 * 960 + x * 2 + 1) * 4]) /
      2,
  );
  assertShift(original, cssRow);
  assertShift(cssRow, cssRow, 60);
});

test('cursor-centred zoom does not treat the changing map center as a pan', async () => {
  const {deck} = harness;
  vi.spyOn(Date, 'now').mockReturnValue(100000);
  const layer = makeAnimatedLayer();
  const cursor = [150, 180];
  const initial = new WebMercatorViewport({
    width: 480,
    height: 360,
    longitude: 0,
    latitude: 0,
    zoom: 1,
  });
  const anchor = initial.unproject(cursor);
  const original = row(await captureLayers(deck, [layer]));
  for (const zoom of [1.01, 1.1, 1.5, 2, 1.5, 1]) {
    const viewport = new WebMercatorViewport({
      width: 480,
      height: 360,
      longitude: 0,
      latitude: 0,
      zoom,
    });
    const center = viewport.panByPosition(anchor, cursor);
    deck.setProps({viewState: {...center, zoom}});
    assertShift(original, row(await captureLayers(deck, [layer.clone()])));
  }
});
