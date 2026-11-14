import {buildIndex, clusterLocations} from '@flowmap.gl/data';
import {expect, test} from 'vitest';
import {createRequire} from 'node:module';
import {URL} from 'node:url';
import {createFlowStaggeringGetter} from '../../packages/data/src/flow-staggering';

const seedrandom = createRequire(
  new URL('../../packages/data/package.json', import.meta.url),
)('seedrandom');
import FlowmapSelectors from '../../packages/data/src/FlowmapSelectors';

const accessors = {
  getLocationId: (d) => d.id,
  getLocationLon: (d) => d.lon,
  getLocationLat: (d) => d.lat,
  getFlowOriginId: (d) => d.origin,
  getFlowDestId: (d) => d.dest,
  getFlowMagnitude: (d) => d.count,
};
const locations = [
  {id: 'a', lon: 0, lat: 0},
  {id: 'b', lon: 0.01, lat: 0},
  {id: 'c', lon: 90, lat: 0},
  {id: 'd', lon: 92, lat: 0},
];
const flows = [
  {origin: 'a', dest: 'c', count: 1},
  {origin: 'b', dest: 'd', count: 1},
];

test.each(['mercator', 'globe'])(
  '%s clusters retain staggering when zoom changes hierarchy IDs',
  (projection) => {
    const clusterLevels = clusterLocations(locations, accessors, () => 1, {
      maxZoom: 5,
      projection,
    });
    const index = buildIndex(clusterLevels);
    const selectors = new FlowmapSelectors(accessors);
    const data = {locations, flows, clusterLevels};
    const byMembership = new Map();
    const observedIds = new Set();
    for (const {zoom} of clusterLevels) {
      const state = {
        settings: {clusteringEnabled: true, clusteringAuto: true},
        viewport: {zoom},
      };
      const stagger = selectors.getFlowStaggeringGetter(state, data);
      for (const node of index.getClusterNodesFor(zoom)) {
        if (!node.children) continue;
        const members = JSON.stringify(
          index.expandCluster(node, Infinity).sort(),
        );
        const value = stagger(node.id, 'destination');
        const previous = byMembership.get(members);
        if (previous !== undefined) expect(value).toBe(previous);
        byMembership.set(members, value);
        observedIds.add(node.id);
      }
    }
    // The Mercator hierarchy specifically exercises ID changes for the same members.
    if (projection === 'mercator')
      expect(observedIds.size).toBeGreaterThan(byMembership.size);
    expect(new Set(byMembership.values()).size).toBe(byMembership.size);
  },
);

test('both layer-data paths retain emitted staggering across cluster ID changes', () => {
  const selectors = new FlowmapSelectors(accessors);
  const clusterLevels = [
    {
      zoom: 0,
      nodes: [
        {id: 'low', zoom: 0, lon: 0.005, lat: 0, children: ['high']},
        locations[2],
      ],
    },
    {
      zoom: 1,
      nodes: [
        {id: 'high', zoom: 1, lon: 0.005, lat: 0, children: ['b', 'a']},
        locations[2],
      ],
    },
    {zoom: 2, nodes: locations.slice(0, 3)},
  ];
  const data = {
    locations: locations.slice(0, 3),
    flows: [
      {origin: 'a', dest: 'c', count: 1},
      {origin: 'b', dest: 'c', count: 1},
    ],
    clusterLevels,
  };
  const state = {
    viewport: {
      width: 10000,
      height: 10000,
      longitude: 45,
      latitude: 0,
      zoom: 0,
    },
    settings: {
      flowLinesRenderingMode: 'animated-straight',
      clusteringEnabled: true,
      clusteringAuto: true,
      adaptiveScalesEnabled: false,
      maxTopFlowsDisplayNum: 5000,
      locationsEnabled: false,
      locationTotalsEnabled: false,
      flowLineThicknessScale: 1,
      colorScheme: 'Teal',
    },
  };
  let original;
  for (const zoom of [0, 1, 0]) {
    const current = {...state, viewport: {...state.viewport, zoom}};
    for (const method of ['getLayersData', 'prepareLayersData']) {
      const {lineAttributes} = selectors[method](current, data);
      expect(lineAttributes.length).toBe(1);
      const values = Array.from(lineAttributes.attributes.getStaggering.value);
      if (original) expect(values).toEqual(original);
      original = values;
    }
  }
});

test('membership is independent of child order and preserves ID types', () => {
  const nodes = [
    {id: 'first', zoom: 0, children: [1, '1'], lon: 0, lat: 0},
    {id: 'second', zoom: 0, children: ['1', 1], lon: 0, lat: 0},
    {id: 'different', zoom: 0, children: ['1'], lon: 0, lat: 0},
  ];
  const stagger = createFlowStaggeringGetter(buildIndex([{zoom: 0, nodes}]));
  expect(stagger('first', 'dest')).toBe(stagger('second', 'dest'));
  expect(stagger('first', 'dest')).not.toBe(stagger('different', 'dest'));
});

test('unclustered flow seeds retain their previous values', () => {
  const stagger = createFlowStaggeringGetter();
  for (const [origin, dest] of [
    ['a', 'b'],
    ['b', 'a'],
    [1, 2],
    ['a-b', 'c'],
  ]) {
    expect(stagger(origin, dest)).toBe(
      new seedrandom.alea(`${origin}-${dest}`)(),
    );
  }
});
