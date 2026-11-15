import {MapView, _GlobeView as GlobeView} from '@deck.gl/core';
import {FlowmapLayer, FlowCirclesLayer} from '@flowmap.gl/layers';
import {assert, test} from 'vitest';
import {setupDeck, frames} from './helpers.js';

const harness = setupDeck({width: 800, height: 600});
const data = {
  locations: [
    {id: 'a', lon: -20, lat: 0},
    {id: 'b', lon: 20, lat: 0},
  ],
  flows: [{origin: 'a', dest: 'b', count: 100}],
};
const makeLayer = (props = {}) =>
  new FlowmapLayer({
    id: 'controls',
    data,
    pickable: true,
    clusteringEnabled: false,
    adaptiveScalesEnabled: false,
    fadeEnabled: false,
    getLocationId: (d) => d.id,
    getLocationLon: (d) => d.lon,
    getLocationLat: (d) => d.lat,
    getFlowOriginId: (d) => d.origin,
    getFlowDestId: (d) => d.dest,
    getFlowMagnitude: (d) => d.count,
    ...props,
  });

test.each([false, true])(
  'disabling picking clears hover highlights without moving the camera (globe=%s)',
  async (globe) => {
    const deck = harness.deck;
    deck.setProps({views: globe ? new GlobeView() : new MapView()});
    for (const target of [
      'location',
      'straight',
      'curved',
      'animated-straight',
    ]) {
      const props = {
        locationsEnabled: target === 'location',
        flowLinesRenderingMode: target === 'location' ? 'straight' : target,
        onHover: () => {},
      };
      let layer = makeLayer(props);
      deck.setProps({layers: [layer]});
      await frames();
      const [x, y] = deck
        .getViewports()[0]
        .project(target === 'location' ? [-20, 0] : [0, 0]);
      const info = deck.pickObject({
        x,
        y,
        radius: target === 'curved' ? 96 : 12,
      });
      assert(info?.picked, `No initial pick for ${target}`);
      layer.props.onHover(info, {});
      await frames();
      const highlights = () =>
        layer
          .getSubLayers()
          .filter((sublayer) => sublayer.id.endsWith('highlight'));
      assert(highlights().length > 0, `No hover highlight for ${target}`);
      assert.isDefined(layer.state.pickingInfo?.object);

      layer = makeLayer({...props, pickable: false});
      deck.setProps({layers: [layer]});
      await frames();
      assert.equal(
        highlights().length,
        0,
        `${target} highlight survived disabling picking`,
      );
      assert.isUndefined(layer.state.pickingInfo);
      assert.isNull(deck.pickObject({x, y, radius: 96}));

      layer = makeLayer(props);
      deck.setProps({layers: [layer]});
      await frames();
      assert.equal(
        highlights().length,
        0,
        `${target} highlight returned without hovering`,
      );
      const nextInfo = deck.pickObject({x, y, radius: 96});
      assert(nextInfo?.picked, `Picking did not recover for ${target}`);
      layer.props.onHover(nextInfo, {});
      await frames();
      assert(
        highlights().length > 0,
        `Highlight did not recover for ${target}`,
      );
    }
  },
);

test.each(['flat', 'globe', 'high-zoom globe'])(
  'circle depth defaults and overrides survive culling defaults (%s)',
  async (projection) => {
    const deck = harness.deck;
    deck.setProps({
      views: projection === 'flat' ? new MapView() : new GlobeView(),
      viewState: {
        longitude: -20,
        latitude: 0,
        zoom: projection === 'high-zoom globe' ? 16 : 1,
        pitch: projection === 'flat' ? 45 : 0,
      },
    });
    for (const [props, expectedDepthTest, expectedCullMode] of [
      [{}, false, 'none'],
      [{parameters: {depthTest: true, cullMode: 'back'}}, true, 'back'],
      [
        {
          _subLayerProps: {
            circles: {parameters: {depthTest: true, cullMode: 'front'}},
          },
        },
        true,
        'front',
      ],
    ]) {
      const layer = makeLayer(props);
      deck.setProps({layers: [layer]});
      await frames();
      const circles = layer
        .getSubLayers()
        .find((sublayer) => sublayer instanceof FlowCirclesLayer);
      assert(circles, 'Circle sublayer missing');
      assert.equal(circles.props.parameters.depthTest, expectedDepthTest);
      assert.equal(circles.props.parameters.cullMode, expectedCullMode);
    }
  },
);
