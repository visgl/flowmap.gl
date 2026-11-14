import {_GlobeViewport as GlobeViewport} from '@deck.gl/core';
import {FlowmapLayer} from '@flowmap.gl/layers';
import FlowmapSelectors, {
  MAX_FLOW_CURVE_OFFSET_PX,
} from '../../packages/data/src/FlowmapSelectors';
import {describe, expect, test} from 'vitest';

const accessors = {
  getLocationId: (d) => d.id,
  getLocationLon: (d) => d.lon,
  getLocationLat: (d) => d.lat,
  getFlowOriginId: (d) => d.origin,
  getFlowDestId: (d) => d.dest,
  getFlowMagnitude: (d) => d.count,
};
const nearby = {
  locations: [
    {id: 'a', lon: 0, lat: 51},
    {id: 'b', lon: 10, lat: 51},
    {id: 'c', lon: 0.2, lat: 51.01},
    {id: 'd', lon: 10.2, lat: 51.01},
  ],
  flows: [
    {origin: 'a', dest: 'b', count: 100},
    {origin: 'c', dest: 'd', count: 90},
  ],
};
const collinear = {
  locations: [
    {id: 'origin', lon: 0, lat: 0},
    // IDs deliberately sort in the opposite order to route length.
    {id: 'z-short', lon: 2, lat: 0},
    {id: 'm-medium', lon: 5, lat: 0.01},
    {id: 'a-long', lon: 10, lat: 0},
  ],
  flows: ['z-short', 'm-medium', 'a-long'].map((dest) => ({
    origin: 'origin',
    dest,
    count: 100,
  })),
};

describe.each(['mercator', 'globe'])('%s curve assignment', (projection) => {
  function reader() {
    const selectors = new FlowmapSelectors(accessors);
    return (data, zoom, view = {}) => {
      const viewport = {
        width: 876,
        height: 574,
        longitude: 5,
        latitude: data.locations[0].lat,
        zoom,
        bearing: 0,
        pitch: 0,
        ...view,
      };
      if (projection === 'globe') {
        const globe = new GlobeViewport(viewport);
        viewport.globe = {
          cameraPosition: globe.cameraPosition,
          viewProjectionMatrix: globe.viewProjectionMatrix,
          // Match pickViewportProps: GlobeViewport uses a different scale.
          clusterZoom: Math.log2(globe.scale * Math.PI),
        };
      }
      const state = {
        settings: {
          ...FlowmapLayer.defaultProps,
          clusteringEnabled: false,
          adaptiveScalesEnabled: false,
          flowLinesRenderingMode: 'curved',
        },
        viewport,
      };
      const offsets = selectors.getLayersData(state, data).lineAttributes
        .attributes.getCurveOffset.value;
      const flows = selectors.getFlowsForFlowmapLayer(state, data);
      return new Map(flows.map((flow, i) => [flow.dest, offsets[i]]));
    };
  }

  test('zooming in and out changes bends continuously without clustering', () => {
    const read = reader();
    const zooms = Array.from({length: 1001}, (_, i) => 4.1 + i / 10000);
    const forward = zooms.map((zoom) => [...read(nearby, zoom).values()]);
    for (let i = 1; i < forward.length; i++) {
      for (let j = 0; j < forward[i].length; j++) {
        expect(forward[i][j]).toBeGreaterThanOrEqual(forward[i - 1][j]);
        expect(forward[i][j] - forward[i - 1][j]).toBeLessThan(0.01);
      }
    }
    expect(
      zooms.toReversed().map((zoom) => [...read(nearby, zoom).values()]),
    ).toEqual(forward.toReversed());
  });

  test('longer nearly collinear routes bow farther, regardless of IDs', () => {
    const read = reader();
    for (const zoom of [2, 3, 4, 5]) {
      const offsets = read(collinear, zoom);
      expect(offsets.get('z-short')).toBeGreaterThan(0);
      expect(offsets.get('m-medium')).toBeGreaterThan(offsets.get('z-short'));
      expect(offsets.get('a-long')).toBeGreaterThan(offsets.get('m-medium'));
      expect(offsets.get('a-long')).toBeLessThanOrEqual(
        MAX_FLOW_CURVE_OFFSET_PX,
      );
    }
  });

  test('reordering, filtering neighbors and panning do not reassign bends', () => {
    const read = reader();
    const expected = read(nearby, 4.1).get('d');
    expect(
      read({...nearby, flows: nearby.flows.toReversed()}, 4.1).get('d'),
    ).toBe(expected);
    expect(read({...nearby, flows: [nearby.flows[1]]}, 4.1).get('d')).toBe(
      expected,
    );
    expect(read(nearby, 4.1, {longitude: 4, bearing: 25}).get('d')).toBe(
      expected,
    );
  });

  test('subpixel routes grow smoothly instead of snapping to a bow', () => {
    const data = {
      locations: [
        {id: 'a', lon: 0, lat: 0},
        {id: 'b', lon: 0.02, lat: 0},
      ],
      flows: [{origin: 'a', dest: 'b', count: 1}],
    };
    const read = reader();
    // These zooms straddle a projected route length of one pixel.
    const zoomOffset = projection === 'globe' ? Math.log2(Math.PI) : 0;
    const before = read(data, 5.13 - zoomOffset, {longitude: 0}).get('b');
    const after = read(data, 5.14 - zoomOffset, {longitude: 0}).get('b');
    expect(before).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(before);
    expect(after - before).toBeLessThan(0.01);
  });
});
