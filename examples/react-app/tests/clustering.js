import {clusterLocations, buildIndex} from '@flowmap.gl/data';
import FlowmapSelectors from '../../../packages/data/src/FlowmapSelectors';
import baseline from './flat-clusters.json';
import {
  indexGlobePoints,
  projectGlobe,
} from '../../../packages/data/src/cluster/globe-projection';

const accessors = {
  getLocationId: (d) => d.id,
  getLocationLon: (d) => d.lon,
  getLocationLat: (d) => d.lat,
  getFlowOriginId: (d) => d.origin,
  getFlowDestId: (d) => d.dest,
  getFlowMagnitude: (d) => d.count,
};
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
const generate = (locations, projection) =>
  clusterLocations(
    locations,
    accessors,
    (id) => locations.find((l) => l.id === id).weight ?? 1,
    {maxZoom: 5, projection},
  );

export function checkClustering(report) {
  // Captured from the original Mercator implementation before this change.
  assert(
    JSON.stringify(generate(baseline.locations, undefined)) ===
      JSON.stringify(baseline.levels),
    'Flat hierarchy changed',
  );
  assert(
    JSON.stringify(generate(baseline.locations, 'mercator')) ===
      JSON.stringify(baseline.levels),
    'Explicit Mercator hierarchy changed',
  );
  report(
    'PASS exact flat hierarchy regression (centers, IDs, levels, duplicates)',
  );

  const locations = [
    {id: 'a', lon: 179, lat: 10, weight: 1},
    {id: 'b', lon: -179, lat: 10, weight: 3},
    {id: 'north-a', lon: 45, lat: 89},
    {id: 'north-b', lon: -135, lat: 89},
    {id: 'south', lon: 45, lat: -89},
    {id: 'dest', lon: 90, lat: 0},
  ];
  const levels = generate(locations, 'globe');
  const index = buildIndex(levels);
  const zoom = index.availableZoomLevels[0];
  const datelineId = index.findClusterFor('a', zoom);
  assert(
    datelineId && datelineId === index.findClusterFor('b', zoom),
    'Dateline neighbors split',
  );
  const center = index.getClusterById(datelineId);
  assert(
    center.lon < -179 && center.lon > -180,
    'Weighted centroid crossed Greenwich',
  );
  const northId = index.findClusterFor('north-a', zoom);
  assert(
    northId && northId === index.findClusterFor('north-b', zoom),
    'Polar neighbors split',
  );
  assert(
    index.getClusterById(northId).lat > 89.9,
    'Polar centroid is not on the sphere',
  );
  assert(
    index.findClusterFor('south', zoom) !== northId,
    'Opposite hemispheres clustered',
  );
  report('PASS spherical dateline/polar neighbors and weighted centers');

  for (const level of levels) {
    const leaves = level.nodes.flatMap((node) =>
      node.children ? index.expandCluster(node) : [node.id],
    );
    assert(
      new Set(leaves).size === locations.length &&
        leaves.length === locations.length,
      'Hierarchy lost or duplicated leaves',
    );
    assert(
      level.nodes.every(
        (n) => Number.isFinite(n.lon) && Number.isFinite(n.lat),
      ),
      'Nonfinite centroid',
    );
  }
  const flows = [
    {origin: 'a', dest: 'dest', count: 3},
    {origin: 'b', dest: 'dest', count: 7},
    {origin: 'a', dest: 'b', count: 5},
  ];
  const aggregated = index.aggregateFlows(flows, zoom, accessors);
  assert(
    aggregated.length === 2 &&
      aggregated.reduce((sum, f) => sum + f.count, 0) === 15,
    'Flow aggregation lost magnitude',
  );
  assert(
    aggregated.some(
      (f) => f.origin === datelineId && f.dest === 'dest' && f.count === 10,
    ),
    'Outgoing flows not combined',
  );
  report('PASS globe hierarchy and flow magnitude conservation');

  const unequalPairs = [
    {id: 'a', lon: 0, lat: 0},
    {id: 'b', lon: 0.01, lat: 0},
    {id: 'c', lon: 90, lat: 0},
    {id: 'd', lon: 92, lat: 0},
  ];
  const unequalLevels = clusterLocations(unequalPairs, accessors, () => 1, {
    projection: 'globe',
    maxZoom: 20,
  });
  const unequalIndex = buildIndex(unequalLevels);
  for (const level of unequalLevels) {
    const leaves = level.nodes.flatMap((n) =>
      n.children ? unequalIndex.expandCluster(n) : [n.id],
    );
    assert(
      leaves.length === 4 && new Set(leaves).size === 4,
      'Carried cluster lost descendants between zoom levels',
    );
  }
  report('PASS clusters survive independent merges at different zooms');

  const equator = Array.from({length: 50000}, (_, i) =>
    projectGlobe(0, -0.05 + (i * 0.1) / 49999),
  );
  const nearby = indexGlobePoints(equator, 40 / (512 * 2 ** 20));
  assert(
    nearby(equator[25000]).length < 100,
    'Equatorial index returns unbounded candidates',
  );
  report('PASS equatorial neighbor-index scalability (50,000 locations)');

  const selectors = new FlowmapSelectors(accessors);
  const data = {locations, flows};
  const state = {
    settings: {clusteringEnabled: true, clusteringAuto: true},
    viewport: {zoom: 1, globe: {clusterZoom: 3}},
  };
  const generated = selectors.getClusterLevels(state, data);
  assert(selectors.getZoom(state, data) === 3, 'Actual globe scale ignored');
  const rotated = {
    ...state,
    viewport: {...state.viewport, longitude: 90, globe: {clusterZoom: 4}},
  };
  assert(
    selectors.getClusterLevels(rotated, data) === generated,
    'Rotation/zoom rebuilt the hierarchy',
  );
  assert(
    selectors.getClusterZoom(
      {
        ...state,
        settings: {
          clusteringEnabled: true,
          clusteringAuto: false,
          clusteringLevel: 2,
        },
      },
      data,
    ) !== undefined,
    'Manual level failed',
  );
  const supplied = {...data, clusterLevels: baseline.levels};
  assert(
    selectors.getClusterLevels(state, supplied) === baseline.levels,
    'Supplied hierarchy replaced',
  );
  assert(
    selectors.getZoom(state, supplied) === 1,
    'Supplied zoom convention changed',
  );
  const flat = {...state, viewport: {zoom: 1}};
  assert(
    selectors
      .getClusterLevels(flat, data)
      .every((l) => l.nodes.every((n) => !String(n.id).includes('globe:'))),
    'Globe hierarchy leaked into flat mode',
  );
  report(
    'PASS projection switching, manual levels, stable hierarchy, supplied clusters',
  );
}
