import {Deck, _GlobeView as GlobeView, MapView} from '@deck.gl/core';
import {
  FlowmapLayer,
  FlowLinesLayer,
  AnimatedFlowLinesLayer,
  CurvedFlowLinesLayer,
} from '@flowmap.gl/layers';
import {checkClustering} from './clustering';
import {isLocationVisibleOnGlobe} from '../../../packages/data/src/globe';

const results = globalThis.document.getElementById('results');
const errors = [];
const lines = [];
const report = (text) => {
  lines.push(text);
  results.textContent = lines.join('\n');
};
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const frames = async () => {
  for (let i = 0; i < 8; i++) {
    await new Promise(globalThis.requestAnimationFrame);
  }
};

async function run() {
  checkClustering(report);
  let deck;
  await new Promise((resolve) => {
    deck = new Deck({
      width: 800,
      height: 600,
      views: new GlobeView(),
      viewState: {longitude: 0, latitude: 0, zoom: 1},
      controller: false,
      onLoad: resolve,
      onError: (error) => errors.push(error.message),
    });
  });
  const makeLayer = (mode, data, extra = {}) =>
    new FlowmapLayer({
      id: 'test-flows',
      data,
      pickable: true,
      flowLinesRenderingMode: mode,
      clusteringEnabled: false,
      adaptiveScalesEnabled: false,
      fadeEnabled: false,
      locationsEnabled: false,
      getLocationId: (d) => d.id,
      getLocationLon: (d) => d.lon,
      getLocationLat: (d) => d.lat,
      getFlowOriginId: (d) => d.origin,
      getFlowDestId: (d) => d.dest,
      getFlowMagnitude: (d) => d.count,
      ...extra,
    });
  const route = (source, target) => ({
    locations: [
      {id: 'a', lon: source[0], lat: source[1]},
      {id: 'b', lon: target[0], lat: target[1]},
    ],
    flows: [{origin: 'a', dest: 'b', count: 100}],
  });
  const pick = (position) => {
    const [x, y] = deck.getViewports()[0].project(position);
    return deck.pickObject({x, y, radius: 12});
  };
  try {
    for (const mode of ['straight', 'animated-straight', 'curved']) {
      const layer = makeLayer(mode, route([-40, 0], [40, 0]));
      deck.setProps({layers: [layer]});
      await frames();
      assert(
        layer.getSubLayers().some((l) => l instanceof CurvedFlowLinesLayer),
        `${mode}: curved layer missing`,
      );
      assert(pick([0, 0])?.index === 0, `${mode}: route not pickable`);
      report(`PASS globe forces curved and picks route: ${mode}`);
    }

    const clusteredData = {
      locations: [
        {id: 'a', lon: 170, lat: 0},
        {id: 'b', lon: 172, lat: 0},
        {id: 'dest', lon: -130, lat: 0},
      ],
      flows: [
        {origin: 'a', dest: 'dest', count: 30},
        {origin: 'b', dest: 'dest', count: 70},
      ],
    };
    for (const enabled of [true, false, true]) {
      const layer = makeLayer('straight', clusteredData, {
        clusteringEnabled: enabled,
      });
      deck.setProps({
        viewState: {longitude: 180, latitude: 0, zoom: 1},
        layers: [layer],
      });
      await frames();
      const line = layer
        .getSubLayers()
        .find((l) => l instanceof CurvedFlowLinesLayer);
      assert(
        line.props.data.length === (enabled ? 1 : 2),
        `Globe clustering toggle (${enabled}): expected ${enabled ? 1 : 2} flows, got ${line.props.data.length}`,
      );
      assert(pick([-170, 0])?.index >= 0, 'Clustered route not pickable');
    }
    report('PASS live globe clustering toggle, aggregated arrows, and picking');
    deck.setProps({viewState: {longitude: 0, latitude: 0, zoom: 1}});

    // A hidden location projects inside the globe disk; it must not be picked.
    const data = route([-40, 0], [120, 0]);
    data.locations.push({id: 'hidden', lon: 180, lat: -30});
    data.flows.push({origin: 'hidden', dest: 'hidden', count: 100});
    deck.setProps({
      layers: [
        makeLayer('straight', data, {
          locationsEnabled: true,
          locationLabelsEnabled: true,
        }),
      ],
    });
    await frames();
    assert(
      pick([20, 0])?.index === 0,
      'Visible portion of horizon-crossing route missing',
    );
    assert(!pick([180, -30]), 'Hidden hemisphere circle/label was pickable');
    report('PASS horizon-crossing route and hidden-side circle picking');

    const viewport = deck.getViewports()[0];
    const state = {
      width: 800,
      height: 600,
      globe: {
        cameraPosition: viewport.cameraPosition,
        viewProjectionMatrix: viewport.viewProjectionMatrix,
      },
    };
    assert(isLocationVisibleOnGlobe(0, 0, state, 0), 'Visible point filtered');
    assert(
      !isLocationVisibleOnGlobe(180, 0, state, 0),
      'Backside point accepted',
    );
    assert(
      !isLocationVisibleOnGlobe(90, 0, state, 0),
      'Perspective horizon ignored',
    );
    report('PASS CPU visibility agrees with front, back, and horizon');

    for (const [name, source, target, center, midpoint] of [
      ['dateline', [170, 0], [-170, 0], [180, 0], [180, 0]],
      ['polar', [-90, 60], [90, 60], [0, 80], [0, 90]],
      ['antipodal', [0, 0], [180, 0], [0, 0], [30, 0]],
    ]) {
      deck.setProps({
        viewState: {longitude: center[0], latitude: center[1], zoom: 1},
        layers: [makeLayer('curved', route(source, target))],
      });
      await frames();
      assert(pick(midpoint)?.index === 0, `${name} route not pickable`);
      report(`PASS ${name} great-circle route`);
    }

    deck.setProps({
      viewState: {longitude: 0, latitude: 0, zoom: 1},
      layers: [makeLayer('curved', route([0, 0], [0, 0]))],
    });
    await frames();
    assert(!pick([0, 0]), 'Coincident route should collapse');
    report('PASS coincident endpoints collapse without shader errors');

    for (const [mode, expected] of [
      ['straight', FlowLinesLayer],
      ['animated-straight', AnimatedFlowLinesLayer],
      ['curved', CurvedFlowLinesLayer],
    ]) {
      const layer = makeLayer(mode, route([-40, 0], [40, 0]));
      deck.setProps({
        views: new MapView(),
        viewState: {longitude: 0, latitude: 0, zoom: 1},
        layers: [layer],
      });
      await frames();
      assert(
        layer.getSubLayers().some((l) => l instanceof expected),
        `${mode}: flat mode changed`,
      );
      assert(
        deck
          .pickObjects({x: 0, y: 0, width: 800, height: 600})
          .some((p) => p.index >= 0),
        `${mode}: flat picking failed`,
      );
      report(`PASS switch back to flat: ${mode}`);
    }
    assert(errors.length === 0, errors.join('\n'));
    report('ALL CHECKS PASSED');
  } finally {
    deck.finalize();
  }
}
run().catch((error) => report(`FAIL: ${error.stack}`));
