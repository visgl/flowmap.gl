---
sidebar_position: 3
---

# Clustering

When visualizing large numbers of locations, flowmap.gl can cluster nearby points together. This improves performance and visual clarity by aggregating locations at different zoom levels.

## How Clustering Works

flowmap.gl uses a hierarchical clustering algorithm based on [supercluster](https://github.com/mapbox/supercluster). As you zoom out, nearby locations merge into clusters. Flows between clustered locations are aggregated (summed).

### Key Concepts

- **Cluster**: A group of nearby locations treated as a single point
- **Cluster Level**: A zoom level at which clustering is applied
- **Cluster Node**: Either an original location or a cluster containing multiple locations
- **Aggregated Flow**: Flows summed across all locations in connected clusters

## Enabling Clustering

Clustering is enabled by default:

```typescript
new FlowmapLayer({
  clusteringEnabled: true,   // Enable clustering (default: true)
  clusteringAuto: true,      // Automatically adjust level (default: true)
  // ...
});
```

## Configuration Options

### `clusteringEnabled`

- Type: `boolean`
- Default: `true`

Whether to enable location clustering.

```typescript
// Disable clustering entirely
new FlowmapLayer({
  clusteringEnabled: false,
  // ...
});
```

### `clusteringAuto`

- Type: `boolean`
- Default: `true`

Whether to automatically select the clustering level based on the current zoom.

```typescript
// Let the library choose clustering level based on zoom
new FlowmapLayer({
  clusteringEnabled: true,
  clusteringAuto: true,  // Automatically adjust
  // ...
});
```

### `clusteringLevel`

- Type: `number`
- Default: `undefined`

Fixed zoom level for clustering. Only used when `clusteringAuto` is `false`.

```typescript
// Use a fixed clustering level
new FlowmapLayer({
  clusteringEnabled: true,
  clusteringAuto: false,
  clusteringLevel: 5,  // Always use zoom level 5 clustering
  // ...
});
```

## Cluster Levels Data Structure

For advanced use cases, you can provide pre-computed cluster levels:

```typescript
interface ClusterLevel {
  zoom: number;
  nodes: ClusterNode[];
}

interface ClusterNode {
  id: string | number;
  zoom: number;
  lat: number;
  lon: number;
}

// Cluster nodes include children IDs
interface Cluster extends ClusterNode {
  name?: string;
  children: (string | number)[];  // IDs of child locations/clusters
}
```

### Example: Pre-computed Clusters

```typescript
const data = {
  locations: [
    {id: 'NYC', name: 'New York', lat: 40.7128, lon: -74.0060},
    {id: 'BOS', name: 'Boston', lat: 42.3601, lon: -71.0589},
    {id: 'PHL', name: 'Philadelphia', lat: 39.9526, lon: -75.1652},
    {id: 'LA', name: 'Los Angeles', lat: 34.0522, lon: -118.2437},
    {id: 'SF', name: 'San Francisco', lat: 37.7749, lon: -122.4194},
  ],
  flows: [
    {origin: 'NYC', dest: 'LA', count: 1000},
    {origin: 'BOS', dest: 'SF', count: 500},
    // ...
  ],
  clusterLevels: [
    {
      zoom: 4,  // Most clustered
      nodes: [
        {
          id: 'east-coast',
          name: 'East Coast',
          zoom: 4,
          lat: 40.5,
          lon: -73.5,
          children: ['NYC', 'BOS', 'PHL'],
        },
        {
          id: 'west-coast',
          name: 'West Coast',
          zoom: 4,
          lat: 36.0,
          lon: -120.0,
          children: ['LA', 'SF'],
        },
      ],
    },
    {
      zoom: 6,  // Less clustered
      nodes: [
        {
          id: 'northeast',
          name: 'Northeast',
          zoom: 6,
          lat: 41.0,
          lon: -73.0,
          children: ['NYC', 'BOS'],
        },
        {id: 'PHL', name: 'Philadelphia', lat: 39.9526, lon: -75.1652, zoom: 6},
        {id: 'LA', name: 'Los Angeles', lat: 34.0522, lon: -118.2437, zoom: 6},
        {id: 'SF', name: 'San Francisco', lat: 37.7749, lon: -122.4194, zoom: 6},
      ],
    },
  ],
};
```

## Clustering Algorithm Details

The built-in clustering algorithm:

1. **Projects locations** to spherical mercator coordinates
2. **Builds a KD-tree** for efficient spatial queries
3. **Iteratively clusters** from max zoom down to min zoom
4. **Weights clusters** by flow magnitude for positioning
5. **Aggregates flows** between cluster members

### Algorithm Parameters

The algorithm uses these internal parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| minZoom | 0 | Minimum zoom to generate clusters |
| maxZoom | 16 | Maximum zoom level for clustering |
| radius | 40 | Cluster radius in pixels |
| extent | 512 | Tile extent (radius is relative to this) |
| nodeSize | 64 | KD-tree leaf node size |

## Customizing Cluster Names

When providing custom cluster levels, set meaningful names:

```typescript
const clusterLevels = [
  {
    zoom: 4,
    nodes: [
      {
        id: 'region-1',
        name: 'US Northeast (3 cities)',  // Descriptive name
        zoom: 4,
        lat: 40.5,
        lon: -73.5,
        children: ['NYC', 'BOS', 'PHL'],
      },
      // ...
    ],
  },
];
```

The cluster name appears in tooltips and picking info.

## Performance Considerations

### When to Enable Clustering

- **Enable** for datasets with many (100+) locations
- **Enable** when locations are densely packed in certain areas
- **Disable** when precise individual locations must always be visible

### Impact on Performance

| Clustering | Performance | Visual Clarity |
|------------|-------------|----------------|
| Enabled | Better - fewer elements to render | Better at low zooms |
| Disabled | May slow down with many locations | Better at high zooms |

### Optimizing Large Datasets

For very large datasets (10,000+ locations):

1. **Use pre-computed clusters** to avoid runtime computation
2. **Set appropriate `maxTopFlowsDisplayNum`** to limit rendered flows
3. **Consider using a Web Worker** (see react-worker-app example)

## Adaptive Scales

When `adaptiveScalesEnabled: true` (default), flow thickness and colors adapt to the visible flows at each zoom level:

```typescript
new FlowmapLayer({
  clusteringEnabled: true,
  adaptiveScalesEnabled: true,  // Scales adjust per zoom
  // ...
});
```

This ensures visual variation is maintained even as flows aggregate during clustering.

## Example: Clustering vs No Clustering

```typescript
// Compare clustering behavior
const withClustering = new FlowmapLayer({
  id: 'with-clustering',
  data,
  clusteringEnabled: true,
  clusteringAuto: true,
  // ...
});

const withoutClustering = new FlowmapLayer({
  id: 'without-clustering',
  data,
  clusteringEnabled: false,
  // ...
});
```
