import {FlowmapLayer} from '@flowmap.gl/layers';
import {assert, test} from 'vitest';
import {setupDeck, frames} from './helpers.js';

const harness = setupDeck({
  viewState: {longitude: 0, latitude: 0, zoom: 3},
});

test('nearly collinear destinations remain independently pickable during zoom', async () => {
  const {deck} = harness;
  const data = {
    locations: [
      {id: 'origin', lon: -12, lat: 0},
      {id: 'short', lon: -4, lat: 0},
      {id: 'medium', lon: 4, lat: 0.01},
      {id: 'long', lon: 12, lat: 0},
    ],
    flows: ['short', 'medium', 'long'].map((dest) => ({
      origin: 'origin',
      dest,
      count: 100,
    })),
  };
  deck.setProps({
    layers: [
      new FlowmapLayer({
        id: 'collinear-curves',
        data,
        pickable: true,
        locationsEnabled: false,
        clusteringEnabled: false,
        adaptiveScalesEnabled: false,
        fadeEnabled: false,
        flowLinesRenderingMode: 'curved',
        flowLineThicknessScale: 0.2,
        getLocationId: (d) => d.id,
        getLocationLon: (d) => d.lon,
        getLocationLat: (d) => d.lat,
        getFlowOriginId: (d) => d.origin,
        getFlowDestId: (d) => d.dest,
        getFlowMagnitude: (d) => d.count,
      }),
    ],
  });
  for (const zoom of [3, 3.02, 3]) {
    deck.setProps({viewState: {longitude: 0, latitude: 0, zoom}});
    await frames();
    const picks = deck.pickObjects({x: 0, y: 0, width: 480, height: 360});
    assert.equal(
      new Set(picks.map((info) => info.index)).size,
      3,
      `A collinear route was hidden by another at zoom ${zoom}`,
    );
  }
});
