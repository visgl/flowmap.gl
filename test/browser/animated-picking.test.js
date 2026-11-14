import {MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {FlowmapLayer, AnimatedFlowLinesLayer} from '@flowmap.gl/layers';
import {LocationFilterMode} from '@flowmap.gl/data';
import {beforeEach, expect, test, vi} from 'vitest';
import {setupDeck, frames, captureLayers, difference} from './helpers.js';

const locations = [
  {id: 'a', lon: -40, lat: 0},
  {id: 'b', lon: 40, lat: 0},
];
const flows = [
  {origin: 'a', dest: 'b', count: 100},
  {origin: 'b', dest: 'a', count: 20},
];
const makeLayer = (props = {}) =>
  new FlowmapLayer({
    id: 'animated-picking',
    data: {locations, flows},
    pickable: true,
    flowLinesRenderingMode: 'animated-straight',
    locationsEnabled: false,
    clusteringEnabled: false,
    adaptiveScalesEnabled: false,
    fadeEnabled: false,
    flowLineThicknessScale: 6,
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
  vi.spyOn(Date, 'now').mockReturnValue(100000);
});
const pick = (side) => deck.pickObject({x: 240, y: 180 + side * 3});
const pickedFlow = async (layer, side) => {
  const info = pick(side);
  expect(info?.picked).toBe(true);
  return layer.state.dataProvider.getFlowByIndex(info.index);
};

test.each(
  [false, true].flatMap((globe) =>
    ['normal', 'non-accumulating'].map((blendingMode) => ({
      globe,
      blendingMode,
    })),
  ),
)(
  'opposite sides select opposite directions: globe=$globe blend=$blendingMode',
  async ({globe, blendingMode}) => {
    deck.setProps({views: globe ? new GlobeView() : new MapView()});
    const onHover = vi.fn();
    const layer = makeLayer({blendingMode, onHover});
    await captureLayers(deck, [layer]);
    for (const time of [100000, 100020]) {
      Date.now.mockReturnValue(time);
      for (const [side, flow] of [
        [1, flows[0]],
        [-1, flows[1]],
      ]) {
        expect(await pickedFlow(layer, side)).toMatchObject(flow);
        layer.props.onHover(pick(side), {});
        await frames();
        expect(onHover.mock.lastCall[0].object.flow).toMatchObject(flow);
        const highlight = layer
          .getSubLayers()
          .find((l) => l.id.endsWith('flow-highlight'));
        expect(highlight).toBeDefined();
        expect(highlight.props.data.attributes.getSourcePosition.value[0]).toBe(
          flow.origin === 'a' ? -40 : 40,
        );
        // The highlight must not intercept the other direction's picking.
        expect(highlight.props.pickable).toBe(false);
      }
    }
  },
);

test('one-way flows keep both halves, including after the reverse is filtered out', async () => {
  let layer = makeLayer({data: {locations, flows: [flows[0]]}});
  await captureLayers(deck, [layer]);
  for (const side of [-1, 1])
    expect(await pickedFlow(layer, side)).toMatchObject(flows[0]);

  layer = makeLayer();
  await captureLayers(deck, [layer]);
  expect(await pickedFlow(layer, -1)).toMatchObject(flows[1]);
  layer = makeLayer({
    filter: {
      selectedLocations: ['a'],
      locationFilterMode: LocationFilterMode.OUTGOING,
    },
  });
  await captureLayers(deck, [layer]);
  for (const side of [-1, 1])
    expect(await pickedFlow(layer, side)).toMatchObject(flows[0]);

  layer = makeLayer();
  await captureLayers(deck, [layer]);
  expect(await pickedFlow(layer, -1)).toMatchObject(flows[1]);
  expect(await pickedFlow(layer, 1)).toMatchObject(flows[0]);
});

test('splitting only changes picking; primitive defaults retain the full width', async () => {
  const layer = new AnimatedFlowLinesLayer({
    id: 'primitive',
    data: [{}],
    pickable: true,
    getSourcePosition: () => [-40, 0],
    getTargetPosition: () => [40, 0],
    getThickness: () => 0.5,
    getStaggering: () => 0.25,
    getColor: () => [80, 120, 180, 255],
    thicknessUnit: 24,
  });
  const full = await captureLayers(deck, [layer]);
  for (const side of [-1, 1]) expect(pick(side)?.index).toBe(0);
  const split = await captureLayers(deck, [
    layer.clone({getHasReverseFlow: 1}),
  ]);
  expect(difference(full, split)).toBe(0);
  expect(pick(1)?.index).toBe(0);
  expect(pick(-1)).toBeNull();
});
