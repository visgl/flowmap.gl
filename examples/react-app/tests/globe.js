import {Deck, _GlobeView as GlobeView, MapView} from '@deck.gl/core';
import {
  FlowmapLayer,
  FlowLinesLayer,
  AnimatedFlowLinesLayer,
  CurvedFlowLinesLayer,
} from '@flowmap.gl/layers';
import {LocalFlowmapDataProvider} from '@flowmap.gl/data';
import {checkClustering} from './clustering';
import {
  isLocationVisibleOnGlobe,
  getGlobeVisibility,
  projectGlobeLocation,
} from '../../../packages/data/src/globe';

const blendingMode =
  new globalThis.URLSearchParams(globalThis.location.search).get(
    'blendingMode',
  ) ?? 'normal';
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
  const accessors = {
    getLocationId: (d) => d.id,
    getLocationLon: (d) => d.lon,
    getLocationLat: (d) => d.lat,
    getFlowOriginId: (d) => d.origin,
    getFlowDestId: (d) => d.dest,
    getFlowMagnitude: (d) => d.count,
  };
  const makeLayer = (mode, data, extra = {}) =>
    new FlowmapLayer({
      id: 'test-flows',
      blendingMode,
      data,
      pickable: true,
      flowLinesRenderingMode: mode,
      clusteringEnabled: false,
      adaptiveScalesEnabled: false,
      fadeEnabled: false,
      locationsEnabled: false,
      ...accessors,
      ...extra,
    });
  const route = (source, target) => ({
    locations: [
      {id: 'a', lon: source[0], lat: source[1]},
      {id: 'b', lon: target[0], lat: target[1]},
    ],
    flows: [{origin: 'a', dest: 'b', count: 100}],
  });
  const xy = (position, [dx, dy] = [0, 0]) => {
    const [x, y] = deck.getViewports()[0].project(position);
    return {x: x + dx, y: y + dy};
  };
  const pick = (position) => deck.pickObject({...xy(position), radius: 12});
  try {
    for (const clusteringEnabled of [false, true]) {
      for (const locations of [undefined, []]) {
        // Each case starts a new layer, then updates that same layer when data arrives.
        const id = `loading-${clusteringEnabled}-${locations === undefined ? 'missing' : 'empty'}`;
        const pendingData = {locations, flows: []};
        const dataProvider = new LocalFlowmapDataProvider(accessors);
        dataProvider.setFlowmapData(pendingData);
        deck.setProps({
          layers: [
            makeLayer('curved', pendingData, {
              id,
              clusteringEnabled,
              dataProvider,
            }),
          ],
        });
        await frames();
        assert(
          !pick([0, 0]),
          `Missing locations produced a pickable flow (locations: ${locations === undefined ? 'undefined' : 'empty'}, clustering: ${clusteringEnabled})`,
        );

        deck.setProps({
          layers: [
            makeLayer('curved', route([-40, 0], [40, 0]), {
              id,
              clusteringEnabled,
            }),
          ],
        });
        await frames();
        assert(
          pick([0, 0])?.index === 0,
          `Globe failed to recover after locations loaded (clustering: ${clusteringEnabled})`,
        );
      }
    }
    report(
      'PASS missing/empty globe locations recover when data arrives, with and without clustering',
    );

    for (const [mode, expected, curviness] of [
      ['straight', CurvedFlowLinesLayer, 0],
      ['animated-straight', AnimatedFlowLinesLayer, undefined],
      ['curved', CurvedFlowLinesLayer, 1],
    ]) {
      const layer = makeLayer(mode, route([-40, 0], [40, 0]));
      deck.setProps({layers: [layer]});
      await frames();
      const subLayers = layer.getSubLayers();
      const line = subLayers.find((l) => l instanceof expected);
      assert(line, `${mode}: ${expected.name} missing on globe`);
      assert(
        !subLayers.some((l) => l instanceof FlowLinesLayer),
        `${mode}: FlowLinesLayer has no globe path`,
      );
      assert(
        line.props.numSegments === 96,
        `${mode}: expected 96 globe segments, got ${line.props.numSegments}`,
      );
      if (curviness !== undefined) {
        assert(
          line.props.curviness === curviness,
          `${mode}: expected curviness ${curviness}, got ${line.props.curviness}`,
        );
      }
      const info = pick([0, 0]);
      assert(info?.index === 0, `${mode}: route not pickable`);

      // Highlights need a globe path too: all modes use the curved arrows.
      layer.props.onHover(info, {});
      deck.setProps({layers: [layer]});
      await frames();
      const highlight = layer
        .getSubLayers()
        .find((l) => l.id.endsWith('flow-highlight'));
      assert(
        highlight instanceof CurvedFlowLinesLayer &&
          highlight.props.curviness === (mode === 'curved' ? 1 : 0),
        `${mode}: globe flow highlight should be an unbowed or matching curved arrow`,
      );
      report(`PASS globe ${mode} uses ${expected.name}, picks and highlights`);
    }

    // Opposite directions of a curved route bow apart into separate corridors.
    const twoWay = route([-40, 0], [40, 0]);
    twoWay.flows.push({origin: 'b', dest: 'a', count: 50});
    for (const mode of ['curved', 'straight']) {
      const layer = makeLayer(mode, twoWay);
      deck.setProps({layers: [layer]});
      await frames();
      const offsets =
        layer.state.layersData.lineAttributes.attributes.getCurveOffset?.value;
      if (mode === 'curved') {
        assert(
          offsets?.length === 2 && offsets.every((d) => d > 0),
          `Globe curved routes missing corridor offsets: ${offsets}`,
        );
        // Each direction bows to its own right of travel: south for a→b
        // heading east, north for b→a heading west.
        // Picking objects resolve asynchronously; name flows by source longitude.
        const sources =
          layer.state.layersData.lineAttributes.attributes.getSourcePosition
            .value;
        const origins = (side) => {
          const hits = new Set();
          for (let dy = 2; dy <= 40; dy += 2) {
            const info = deck.pickObject({
              ...xy([0, 0], [0, side * dy]),
              radius: 0,
            });
            if (info) hits.add(sources[info.index * 3] < 0 ? 'a' : 'b');
          }
          return [...hits].join();
        };
        const [north, south] = [origins(-1), origins(1)];
        assert(
          north === 'b' && south === 'a',
          `Opposite curved globe routes did not separate (north: ${north}, south: ${south})`,
        );
      } else {
        assert(!offsets, 'Globe straight routes should not bow');
      }
    }
    report(
      'PASS globe curved corridors bow opposite directions apart; straight stays unbowed',
    );

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
    const visibility = getGlobeVisibility(state, 0);
    assert(
      !visibility.arc(
        projectGlobeLocation(150, 0),
        projectGlobeLocation(-150, 0),
      ),
      'Hidden hemisphere arc accepted',
    );
    for (let i = 0; i < 300; i++) {
      const a = projectGlobeLocation(
        ((i * 137.5) % 360) - 180,
        Math.sin(i) * 85,
      );
      const b = projectGlobeLocation(
        ((i * 31.7 + 120) % 360) - 180,
        Math.cos(i) * 85,
      );
      const angle = Math.acos(
        Math.max(
          -1,
          Math.min(
            1,
            a.reduce((sum, x, j) => sum + x * b[j], 0),
          ),
        ),
      );
      if (Math.sin(angle) < 1e-6) continue;
      for (let j = 0; j <= 64; j++) {
        const t = j / 64;
        const sample = a.map(
          (x, k) =>
            (x * Math.sin((1 - t) * angle) + b[k] * Math.sin(t * angle)) /
            Math.sin(angle),
        );
        assert(
          !visibility.point(sample) || visibility.arc(a, b),
          'Arc culling discarded a visible sample',
        );
      }
    }
    report('PASS conservative arc culling against 19,500 spherical samples');
    report('PASS CPU visibility agrees with front, back, and horizon');

    for (const mode of ['any', 'both']) {
      deck.setProps({
        viewState: {longitude: 0, latitude: 0, zoom: 4},
        layers: [
          makeLayer('curved', route([-40, 0], [40, 0]), {
            flowEndpointsInViewportMode: mode,
          }),
        ],
      });
      await frames();
      const v = deck.getViewports()[0];
      const zoomedState = {
        width: v.width,
        height: v.height,
        globe: {
          cameraPosition: v.cameraPosition,
          viewProjectionMatrix: v.viewProjectionMatrix,
        },
      };
      assert(
        !isLocationVisibleOnGlobe(-40, 0, zoomedState, 17) &&
          !isLocationVisibleOnGlobe(40, 0, zoomedState, 17),
        'Crossing test endpoints should be outside screen',
      );
      assert(
        Boolean(pick([0, 0])) === (mode === 'any'),
        `Crossing route visibility failed for ${mode}`,
      );
    }
    report(
      'PASS zoomed globe crossing arc survives off-screen endpoints; both mode stays strict',
    );

    const parameterLayer = makeLayer('curved', route([-40, 0], [40, 0]), {
      parameters: {
        depthCompare: 'less-equal',
        depthWriteEnabled: true,
        cullMode: 'back',
      },
    });
    deck.setProps({
      layers: [parameterLayer],
      viewState: {longitude: 0, latitude: 0, zoom: 1},
    });
    await frames();
    const parameters = parameterLayer
      .getSubLayers()
      .find((layer) => layer instanceof CurvedFlowLinesLayer).props.parameters;
    assert(
      parameters.depthCompare === 'less-equal' &&
        parameters.depthWriteEnabled &&
        parameters.cullMode === 'back',
      'Explicit globe render parameters overwritten',
    );
    report('PASS explicit globe render parameters are preserved');

    for (const [name, source, target, center, midpoint] of [
      ['dateline', [170, 0], [-170, 0], [180, 0], [180, 0]],
      ['polar', [-90, 60], [90, 60], [0, 80], [0, 90]],
      ['antipodal', [0, 0], [180, 0], [0, 0], [30, 0]],
    ]) {
      for (const mode of ['straight', 'animated-straight', 'curved']) {
        deck.setProps({
          viewState: {longitude: center[0], latitude: center[1], zoom: 1},
          layers: [makeLayer(mode, route(source, target))],
        });
        await frames();
        assert(
          pick(midpoint)?.index === 0,
          `${name} route not pickable: ${mode}`,
        );
      }
      report(`PASS ${name} great-circle route in all rendering modes`);
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
    const globeView = new GlobeView({id: 'globe-view', x: 0, width: '50%'});
    const flatView = new MapView({id: 'flat-view', x: '50%', width: '50%'});
    const multiData = {
      locations: [
        ...route([-40, 0], [40, 0]).locations,
        {id: 'c', lon: 120, lat: 0},
        {id: 'd', lon: 160, lat: 0},
      ],
      flows: [
        {origin: 'a', dest: 'b', count: 100},
        {origin: 'c', dest: 'd', count: 90},
      ],
    };
    for (const views of [
      [globeView, flatView],
      [flatView, globeView],
    ]) {
      const globeCenter = views[0] === globeView ? 0 : 140;
      const flatCenter = views[0] === globeView ? 140 : 0;
      const globeLayer = makeLayer('straight', multiData, {
        id: 'globe-flows',
        viewId: 'globe-view',
      });
      const flatLayer = makeLayer('straight', multiData, {
        id: 'flat-flows',
        viewId: 'flat-view',
      });
      deck.setProps({
        views,
        viewState: {
          'globe-view': {longitude: globeCenter, latitude: 0, zoom: 1},
          'flat-view': {longitude: flatCenter, latitude: 0, zoom: 1},
        },
        layers: [globeLayer, flatLayer],
      });
      await frames();
      assert(
        globeLayer
          .getSubLayers()
          .some((layer) => layer instanceof CurvedFlowLinesLayer),
        'Mixed-view globe straight did not use the curved arrows',
      );
      assert(
        flatLayer
          .getSubLayers()
          .some((layer) => layer instanceof FlowLinesLayer),
        'Mixed-view flat mode inherited globe rendering',
      );
      for (const v of deck.getViewports()) {
        const [x, y] = v.project([
          v.id === 'globe-view' ? globeCenter : flatCenter,
          0,
        ]);
        const hit = deck.pickObject({x: x + v.x, y: y + v.y, radius: 12});
        const expectedId = v.id === 'globe-view' ? 'globe-flows' : 'flat-flows';
        assert(
          hit?.layer.id.startsWith(expectedId),
          `Picking leaked between views: ${v.id}`,
        );
      }
    }
    report(
      'PASS independently bound globe/flat views render and pick in both view orders',
    );

    const flatViews = [
      new MapView({id: 'left', x: 0, width: '50%'}),
      new MapView({id: 'right', x: '50%', width: '50%'}),
    ];
    for (const viewId of [undefined, 'left']) {
      deck.setProps({
        views: flatViews,
        viewState: {longitude: 0, latitude: 0, zoom: 1},
        layers: [makeLayer('straight', route([-40, 0], [40, 0]), {viewId})],
      });
      await frames();
      for (const v of deck.getViewports()) {
        const [x, y] = v.project([0, 0]);
        const hit = deck.pickObject({x: x + v.x, y: y + v.y, radius: 12});
        assert(
          Boolean(hit) === (viewId === undefined || v.id === viewId),
          `Flat multi-view visibility failed for binding ${viewId}, view ${v.id}`,
        );
      }
    }
    report(
      'PASS legacy unbound flat multi-view drawing and explicit view isolation',
    );

    const pendingLayer = makeLayer('straight', route([-40, 0], [40, 0]), {
      id: 'pending-view-flows',
      viewId: 'late-view',
    });
    deck.setProps({layers: [pendingLayer]});
    for (let i = 0; i < 2; i++) {
      deck.setProps({views: flatViews});
      await frames();
      assert(
        deck.pickObjects({x: 0, y: 0, width: 800, height: 600}).length === 0,
        'Missing bound view leaked into another view',
      );
      deck.setProps({views: new GlobeView({id: 'late-view'})});
      await frames();
      assert(
        pick([0, 0]),
        'Restored bound view did not recover rendering/picking',
      );
      assert(
        pendingLayer
          .getSubLayers()
          .some((layer) => layer instanceof CurvedFlowLinesLayer),
        'Restored globe binding retained flat rendering',
      );
    }
    report(
      'PASS missing bound view stays hidden and recovers after addition/removal',
    );

    const fallbackViewport = deck.getViewports()[0];
    for (const viewId of [undefined, 'late-view']) {
      const uninitializedLayer = makeLayer('straight', undefined, {viewId});
      uninitializedLayer.context = {
        viewport: fallbackViewport,
        deck: {getViewports: () => []},
      };
      assert(
        uninitializedLayer._getViewport() === fallbackViewport,
        'Empty viewport list did not use the initialization context',
      );
    }
    report('PASS empty viewport list safely uses the initialization context');

    assert(errors.length === 0, errors.join('\n'));
    report('ALL CHECKS PASSED');
  } finally {
    deck.finalize();
  }
}
run().catch((error) => report(`FAIL: ${error.stack}`));
