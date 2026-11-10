import {Deck, MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {FlowmapLayer} from '@flowmap.gl/layers';

const results = globalThis.document.getElementById('results');
const lines = [];
const report = (message) => {
  lines.push(message);
  results.textContent = lines.join('\n');
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const frames = async () => {
  for (let i = 0; i < 8; i++)
    await new Promise(globalThis.requestAnimationFrame);
};
const WIDTH = 480;
const HEIGHT = 360;
const MODES = ['straight', 'curved', 'animated-straight'];
const accessors = {
  getLocationId: (d) => d.id,
  getLocationLon: (d) => d.lon,
  getLocationLat: (d) => d.lat,
  getFlowOriginId: (d) => d.origin,
  getFlowDestId: (d) => d.dest,
  getFlowMagnitude: (d) => d.count,
};
// 30° apart across the antimeridian, or 330° the other way.
const crossing = {
  locations: [
    {id: 'a', lon: 165, lat: 10},
    {id: 'b', lon: -165, lat: -10},
  ],
  flows: [{origin: 'a', dest: 'b', count: 100}],
};
const regular = {
  locations: [
    {id: 'c', lon: -15, lat: 5},
    {id: 'd', lon: 15, lat: -5},
  ],
  flows: [{origin: 'c', dest: 'd', count: 100}],
};
const makeLayer = (id, data, props = {}) =>
  new FlowmapLayer({
    id,
    data,
    pickable: true,
    locationsEnabled: false,
    clusteringEnabled: false,
    adaptiveScalesEnabled: false,
    fadeEnabled: false,
    darkMode: true,
    opacity: 0.5,
    colorScheme: ['#287fc0', '#287fc0'],
    flowLineThicknessScale: 2,
    ...accessors,
    ...props,
  });
const difference = (a, b) =>
  a.reduce((max, x, i) => Math.max(max, Math.abs(x - b[i])), 0);

async function run() {
  const errors = [];
  let deck;
  await new Promise((resolve) => {
    deck = new Deck({
      width: WIDTH,
      height: HEIGHT,
      useDevicePixels: false,
      viewState: {longitude: 0, latitude: 0, zoom: 3},
      controller: false,
      onLoad: resolve,
      onError: (e) => errors.push(e.message),
    });
  });
  const capture = async (layers) => {
    deck.setProps({layers});
    await frames();
    deck.redraw('capture');
    const gl = deck.getCanvas().getContext('webgl2');
    const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
    gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  };
  // Brightest channel sum in a screen column (deck.gl's y runs top-down).
  const columnPeak = (pixels, x) => {
    let peak = 0;
    for (let y = 0; y < HEIGHT; y++) {
      const i = (y * WIDTH + x) * 4;
      peak = Math.max(peak, pixels[i] + pixels[i + 1] + pixels[i + 2]);
    }
    return peak;
  };
  const painted = (pixels, x) => columnPeak(pixels, x) > 30;
  const anyPainted = (pixels) =>
    Array.from({length: WIDTH}, (_, x) => x).some((x) => painted(pixels, x));
  // The rectangle includes its right edge, so keep a margin from the meridian.
  const picksIn = (x, width) =>
    deck
      .pickObjects({x, y: 0, width, height: HEIGHT})
      .filter((info) => info.index === 0).length > 0;
  const setView = (View, props = {}) =>
    deck.setProps({
      views: new View({clear: true, clearColor: [0, 0, 0, 255], ...props}),
    });
  const view = (longitude) =>
    deck.setProps({viewState: {longitude, latitude: 0, zoom: 3}});
  // Pixel columns beside the meridian when centered 10° from it (zoom 3).
  // Fragments are clipped at their centers.
  const meridianOffset = (10 * 512 * 2 ** 3) / 360;
  const lastWest = Math.floor(WIDTH / 2 + meridianOffset - 0.5); // at 170°
  const firstEast = Math.floor(WIDTH / 2 - meridianOffset - 0.5) + 1; // at -170°

  const realNow = Date.now;
  Date.now = () => 100000; // Hold animated pulses still for pixel comparisons.
  try {
    for (const mode of MODES) {
      const props = {flowLinesRenderingMode: mode};
      const wrapProps = {...props, wrapLongitude: true};
      // Each half in a single-world view on its side of the meridian. A
      // repeated map shows both, one per copy of the world.
      setView(MapView);
      view(170);
      const unwrapped = await capture([makeLayer('off', crossing, props)]);
      assert(
        !painted(unwrapped, lastWest),
        `${mode}: without wrapLongitude the route crossed the antimeridian`,
      );
      const west = await capture([makeLayer('west', crossing, wrapProps)]);
      const westPickable = picksIn(lastWest - 50, 50);
      const westClippedPickable = picksIn(lastWest + 2, 50);
      view(-170);
      const east = await capture([makeLayer('east', crossing, wrapProps)]);
      const eastPickable = picksIn(firstEast, 50);
      const eastClippedPickable = picksIn(firstEast - 52, 50);
      for (let i = 0; i < 4; i++) {
        assert(
          painted(west, lastWest - i) && painted(east, firstEast + i),
          `${mode}: wrapped route has a gap at the meridian`,
        );
        assert(
          !painted(west, lastWest + 1 + i) && !painted(east, firstEast - 1 - i),
          `${mode}: wrapped halves are not clipped at the meridian`,
        );
      }
      if (mode !== 'animated-straight') {
        const peaks = [columnPeak(west, lastWest), columnPeak(east, firstEast)];
        assert(
          Math.abs(peaks[0] - peaks[1]) <= 6,
          `${mode}: wrapped halves differ at the meridian (${peaks})`,
        );
      }
      assert(
        westPickable &&
          eastPickable &&
          !westClippedPickable &&
          !eastClippedPickable,
        `${mode}: picking does not match the drawn halves`,
      );

      // Under pitch and bearing the meridian is a slanted line on screen, and
      // the animated strip is extruded in screen space rather than on the map.
      // Every drawn pixel must still lie on its pass's side of the meridian,
      // and the halves must reach it.
      for (const [longitude, side] of [
        [175, 1],
        [-175, -1],
      ]) {
        deck.setProps({
          viewState: {longitude, latitude: 0, zoom: 4, pitch: 60, bearing: 30},
        });
        const pixels = await capture([
          makeLayer(`pitched${side}`, crossing, {
            ...wrapProps,
            flowLineThicknessScale: 6,
          }),
        ]);
        const viewport = deck.getViewports()[0];
        let past = 0;
        let nearest = Infinity;
        for (let y = 0; y < HEIGHT; y++) {
          for (let x = 0; x < WIDTH; x++) {
            const i = ((HEIGHT - 1 - y) * WIDTH + x) * 4;
            if (pixels[i] + pixels[i + 1] + pixels[i + 2] <= 30) continue;
            const [lng] = viewport.unproject([x + 0.5, y + 0.5]);
            const beyond = side * (lng - side * 180);
            if (beyond > 1e-3) past++;
            nearest = Math.min(nearest, -beyond);
          }
        }
        assert(
          past === 0 && nearest < 0.05,
          `${mode}: pitched pass ${side} clipped off the meridian (${past} pixels past it, nearest ${nearest.toFixed(3)}°)`,
        );
      }
      deck.setProps({viewState: {longitude: 0, latitude: 0, zoom: 3}});

      // Routes that do not cross are drawn exactly once, unchanged.
      view(0);
      const regularOff = await capture([makeLayer('r-off', regular, props)]);
      const regularOn = await capture([
        makeLayer('r-on', regular, {...props, wrapLongitude: true}),
      ]);
      assert(
        anyPainted(regularOff) && difference(regularOff, regularOn) === 0,
        `${mode}: wrapLongitude changed a route that does not cross`,
      );

      // Great circles never wrap.
      setView(GlobeView);
      view(180);
      const globeOff = await capture([makeLayer('g-off', crossing, props)]);
      const globeOn = await capture([
        makeLayer('g-on', crossing, {...props, wrapLongitude: true}),
      ]);
      assert(
        anyPainted(globeOff) && difference(globeOff, globeOn) === 0,
        `${mode}: wrapLongitude changed a globe route`,
      );
      report(
        `PASS ${mode}: shortest path, seamless halves, picking, clipping, unchanged regular and globe routes`,
      );
    }

    // Viewport queries match locations in the world's repeated copies.
    const layersData = async (id, data, viewProps, props) => {
      setView(MapView, viewProps);
      const layer = makeLayer(id, data, {
        flowEndpointsInViewportMode: 'both',
        ...props,
      });
      await capture([layer]);
      return layer.state.layersData;
    };
    view(180);
    assert(
      (await layersData('repeat', crossing, {repeat: true})).lineAttributes
        .length === 1,
      'Repeated world: endpoint beyond 180° not found in the viewport',
    );
    assert(
      (await layersData('no-repeat', crossing, {repeat: false})).lineAttributes
        .length === 0,
      'Single world: endpoint in an unrendered copy counted as visible',
    );
    report('PASS viewport queries wrap only when the map repeats');

    // Both directions of a wrapped route share one corridor, so they bow apart.
    const bothWays = {
      ...crossing,
      flows: [...crossing.flows, {origin: 'b', dest: 'a', count: 50}],
    };
    const offsets = (
      await layersData(
        'corridor',
        bothWays,
        {repeat: true},
        {flowLinesRenderingMode: 'curved', wrapLongitude: true},
      )
    ).lineAttributes.attributes.getCurveOffset.value;
    assert(
      Array.from(offsets)
        .sort((a, b) => a - b)
        .join() === '18,36',
      `Wrapped opposite routes did not share a corridor (${Array.from(offsets)})`,
    );
    report('PASS wrapped curved corridors');

    assert(errors.length === 0, errors.join('\n'));
    report('ALL CHECKS PASSED');
  } finally {
    Date.now = realNow;
    deck.finalize();
  }
}
run().catch((error) => report(`FAIL: ${error.stack}`));
