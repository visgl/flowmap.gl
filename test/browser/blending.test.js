import {MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {
  FlowmapLayer,
  FlowLinesLayer,
  CurvedFlowLinesLayer,
  AnimatedFlowLinesLayer,
  getFlowmapCanvasClearColor,
  getFlowmapCanvasEffects,
} from '@flowmap.gl/layers';
import {getColors} from '@flowmap.gl/data';

import {assert, beforeEach, test, vi} from 'vitest';
import {setupDeck, frames, captureLayers, difference} from './helpers.js';

const data = {
  locations: [
    {id: 'a', lon: -40, lat: -15},
    {id: 'b', lon: 40, lat: 15},
    {id: 'c', lon: -40, lat: 15},
    {id: 'd', lon: 40, lat: -15},
  ],
  flows: [
    {origin: 'a', dest: 'b', count: 100},
    {origin: 'c', dest: 'd', count: 20},
  ],
};
const makeLayer = (id, props = {}) =>
  new FlowmapLayer({
    id,
    data,
    pickable: true,
    locationsEnabled: false,
    clusteringEnabled: false,
    adaptiveScalesEnabled: false,
    fadeEnabled: false,
    colorScheme: ['#287fc0', '#287fc0'],
    flowLineThicknessScale: 2,
    getLocationId: (d) => d.id,
    getLocationLon: (d) => d.lon,
    getLocationLat: (d) => d.lat,
    getFlowOriginId: (d) => d.origin,
    getFlowDestId: (d) => d.dest,
    getFlowMagnitude: (d) => d.count,
    ...props,
  });
const harness = setupDeck();
let deck;
beforeEach(() => {
  deck = harness.deck;
  // Freeze only animation time; Deck still needs real animation frames.
  vi.spyOn(Date, 'now').mockReturnValue(100000);
});
const capture = (layers) => captureLayers(deck, layers);

const overlapCases = [
  [false, 'straight'],
  [false, 'curved'],
  [false, 'animated-straight'],
  [true, 'curved'],
].flatMap(([globe, mode]) =>
  [false, true].flatMap((darkMode) =>
    ['neutral', 'basemap'].map((destination) => ({
      globe,
      mode,
      darkMode,
      destination,
    })),
  ),
);
test.each(overlapCases)(
  'overlaps, colors, opacity, picking and highlight: globe=$globe mode=$mode dark=$darkMode destination=$destination',
  async ({globe, mode, darkMode, destination}) => {
    const props = {
      darkMode,
      flowLinesRenderingMode: mode,
      blendingMode: 'non-accumulating',
      opacity: 0.45,
    };
    const clearColor =
      destination === 'neutral'
        ? getFlowmapCanvasClearColor(props)
        : darkMode
          ? [30, 50, 65, 255]
          : [225, 230, 215, 255];
    const View = globe ? GlobeView : MapView;
    deck.setProps({views: new View({clear: true, clearColor})});
    const empty = await capture([]);
    let layer = makeLayer('one', props);
    const once = await capture([layer]);
    assert(difference(empty, once) > 10, 'Flow must be visibly rendered');
    const repeated = await capture(
      Array.from({length: 12}, (_, i) => makeLayer(`copy-${i}`, props)),
    );
    assert(
      difference(once, repeated) <= 1,
      'Identical overlaps intensified (including antialiased edges)',
    );
    // Different hues must combine per channel, independently of draw order.
    const secondProps = {...props, colorScheme: ['#d05040', '#d05040']};
    const other = await capture([makeLayer('other', secondProps)]);
    const expected = once.map((value, index) =>
      index % 4 === 3
        ? 255
        : (darkMode ? Math.max : Math.min)(value, other[index]),
    );
    const mixed = await capture([
      makeLayer('mix-a', props),
      makeLayer('mix-b', secondProps),
    ]);
    const reversed = await capture([
      makeLayer('mix-b', secondProps),
      makeLayer('mix-a', props),
    ]);
    assert(
      difference(expected, mixed) <= 1,
      'Colors did not combine with per-channel min/max',
    );
    assert(
      difference(mixed, reversed) <= 1,
      'Changing draw order changed min/max output',
    );
    const zero = await capture([makeLayer('zero', {...props, opacity: 0})]);
    assert(
      difference(empty, zero) === 0,
      'Zero opacity changed the destination',
    );
    layer = makeLayer('pick', props);
    const beforeHighlight = await capture([layer]);
    const picks = deck.pickObjects({x: 0, y: 0, width: 480, height: 360});
    assert(
      picks.some((p) => p.index === 0),
      'Flow picking corrupted by min/max',
    );
    const picked = picks.find((p) => p.index === 0);
    layer.props.onHover(picked, {});
    await frames();
    assert(
      layer.getSubLayers().some((l) => l.id.endsWith('flow-highlight')),
      'Highlight missing',
    );
    const highlighted = await capture([layer]);
    assert(
      difference(beforeHighlight, highlighted) > 10,
      'Highlight is not visible',
    );
  },
);

test.each(
  [FlowLinesLayer, CurvedFlowLinesLayer, AnimatedFlowLinesLayer].map(
    (Primitive) => [Primitive.layerName, Primitive],
  ),
)(
  '%s preserves source alpha, transitive picking and cloning back to normal',
  async (_name, Primitive) => {
    deck.setProps({
      views: new MapView({clear: true, clearColor: [0, 0, 0, 255]}),
    });
    class DependencyOnlyPrimitive extends Primitive {
      getShaders() {
        const shaders = super.getShaders();
        return {
          ...shaders,
          modules: shaders.modules.filter(
            (module) => module.name !== 'picking',
          ),
        };
      }
    }
    const primitive = new DependencyOnlyPrimitive({
      // deck.gl matches layers by id; a shared id would carry one class's
      // state (model, attributes) into the next.
      id: `primitive-${Primitive.layerName}`,
      pickable: true,
      data: [{}, {}, {}],
      darkMode: true,
      drawOutline: false,
      getSourcePosition: () => [-40, 0],
      getTargetPosition: () => [40, 0],
      getColor: () => [80, 120, 180, 128],
      getThickness: () => 0.5,
      getEndpointOffsets: () => [0, 0],
      getStaggering: () => 0.25,
    });
    const normal = await capture([primitive]);
    const nonAccumulating = primitive.clone({
      blendingMode: 'non-accumulating',
    });
    const nonAccumulatingPixels = await capture([nonAccumulating]);
    assert(
      deck.pickObjects({x: 0, y: 0, width: 480, height: 360}).length > 0,
      'Transitive picking shader dependency missing',
    );
    assert(
      difference(normal, nonAccumulatingPixels) > 10,
      'Primitive did not use min/max with source alpha',
    );
    const backToNormal = await capture([
      nonAccumulating.clone({blendingMode: 'normal'}),
    ]);
    assert(
      difference(normal, backToNormal) === 0,
      'Cloned primitive retained stale min/max parameters',
    );
  },
);

test('defaults, live blending changes and fading restore normal output', async () => {
  assert(
    getFlowmapCanvasClearColor({blendingMode: 'non-accumulating'}).join(',') ===
      '0,0,0,255',
    'Canvas default theme differs from the layer',
  );
  // Switching both blend equations and fade settings on an existing layer must update.
  deck.setProps({
    views: new MapView({clear: true, clearColor: [255, 255, 255, 255]}),
  });
  const initial = await capture([makeLayer('switch', {darkMode: false})]);
  const explicit = await capture([
    makeLayer('switch', {darkMode: false, blendingMode: 'normal'}),
  ]);
  assert(difference(initial, explicit) === 0, 'Normal default changed');
  const blended = await capture([
    makeLayer('switch', {
      darkMode: false,
      blendingMode: 'non-accumulating',
      fadeEnabled: true,
      fadeAmount: 75,
    }),
  ]);
  const faded = await capture([
    makeLayer('switch', {
      darkMode: false,
      blendingMode: 'non-accumulating',
      fadeEnabled: true,
      fadeAmount: 75,
      fadeOpacityEnabled: true,
    }),
  ]);
  assert(difference(blended, faded) > 0, 'fadeOpacityEnabled had no effect');
  const restored = await capture([
    makeLayer('switch', {darkMode: false, blendingMode: 'normal'}),
  ]);
  assert(
    difference(initial, restored) === 0,
    'Switching back to normal retained min/max',
  );
  for (const darkMode of [false, true]) {
    const colors = getColors(
      false,
      ['#287fc0', '#287fc0'],
      darkMode,
      true,
      false,
      100,
      false,
      'non-accumulating',
    );
    assert(
      colors.flows.scheme[0] ===
        (darkMode ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)'),
      'Fading did not reach the neutral color',
    );
  }
});

test('explicit depth parameters override non-accumulating defaults', async () => {
  const flowModelParameters = () =>
    deck.layerManager
      .getLayers()
      .filter((layer) => layer.id.endsWith('flow-lines'))
      .map((layer) => layer.state.model.parameters);
  for (const [parameters, expected] of [
    [undefined, ['always', false]],
    [
      {depthCompare: 'less-equal', depthWriteEnabled: true},
      ['less-equal', true],
    ],
  ]) {
    await capture([
      makeLayer('depth', {blendingMode: 'non-accumulating', parameters}),
    ]);
    const models = flowModelParameters();
    assert(models.length > 0, 'Flow line sublayer not found');
    for (const p of models) {
      assert(
        p.depthCompare === expected[0] &&
          p.depthWriteEnabled === expected[1] &&
          p.blendColorOperation === 'max',
        `Depth parameters ${JSON.stringify(parameters)} resolved to ` +
          `${p.depthCompare}/${p.depthWriteEnabled}/${p.blendColorOperation}`,
      );
    }
  }
});

// A 256px-wide world fits twice in this 480px canvas.
test.each([false, true])(
  'repeated worlds retain rendering, picking and clearing (dark=%s)',
  async (darkMode) => {
    const props = {darkMode, blendingMode: 'non-accumulating'};
    const clearColor = getFlowmapCanvasClearColor(props);
    deck.setProps({
      views: new MapView({repeat: true}),
      viewState: {longitude: 180, latitude: 0, zoom: -1},
      effects: getFlowmapCanvasEffects(props),
    });
    const empty = await capture([]);
    assert(
      empty.every((value, i) => value === clearColor[i % 4]),
      'Canvas was not cleared to the neutral color',
    );
    for (const mode of ['straight', 'curved', 'animated-straight']) {
      const layer = makeLayer('repeated', {
        ...props,
        flowLinesRenderingMode: mode,
      });
      const pixels = await capture([layer]);
      for (const x of [0, 240]) {
        let painted = false;
        for (let y = 0; y < 360 && !painted; y++) {
          for (let column = x; column < x + 240; column++) {
            const i = (y * 480 + column) * 4;
            if (Math.abs(pixels[i] - empty[i]) > 10) {
              painted = true;
              break;
            }
          }
        }
        assert(painted, `${mode}: repeated world at x=${x} was erased`);
        assert(
          deck.pickObjects({x, y: 0, width: 240, height: 360}).length > 0,
          `${mode}: repeated world at x=${x} is not pickable`,
        );
      }
      assert(
        difference(pixels, await capture([layer])) === 0,
        `${mode}: picking or redrawing changed the canvas`,
      );
    }
    assert(
      difference(empty, await capture([])) === 0,
      'Removing layers left trails from a previous frame',
    );
  },
);
