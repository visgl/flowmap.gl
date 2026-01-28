---
sidebar_position: 3
---

# Data Format

flowmap.gl visualizes movement between geographic locations. This guide explains how to structure your data.

## FlowmapData Structure

The `FlowmapLayer` accepts data in the following structure:

```typescript
interface FlowmapData<L, F> {
  locations: Iterable<L>;  // Array or iterable of location objects
  flows: Iterable<F>;      // Array or iterable of flow objects
  clusterLevels?: ClusterLevels;  // Optional pre-computed clusters
}
```

## Location Data

Each location represents a geographic point. At minimum, locations need:

- A unique identifier
- Latitude coordinate
- Longitude coordinate
- Optional: name for display

### Example Location Data

```typescript
const locations = [
  {id: 'NYC', name: 'New York', lat: 40.7128, lon: -74.0060},
  {id: 'LA', name: 'Los Angeles', lat: 34.0522, lon: -118.2437},
  {id: 'CHI', name: 'Chicago', lat: 41.8781, lon: -87.6298},
  {id: 'HOU', name: 'Houston', lat: 29.7604, lon: -95.3698},
];
```

### Location Accessor Functions

Tell flowmap.gl how to read your location data with accessor functions:

```typescript
new FlowmapLayer({
  // ...
  getLocationId: (loc) => loc.id,
  getLocationLat: (loc) => loc.lat,
  getLocationLon: (loc) => loc.lon,
  getLocationName: (loc) => loc.name,  // Optional
});
```

## Flow Data

Each flow represents movement from an origin to a destination. At minimum, flows need:

- Origin location ID
- Destination location ID
- Magnitude (count/amount)

### Example Flow Data

```typescript
const flows = [
  {origin: 'NYC', dest: 'LA', count: 1200},
  {origin: 'NYC', dest: 'CHI', count: 850},
  {origin: 'LA', dest: 'NYC', count: 900},
  {origin: 'LA', dest: 'CHI', count: 500},
  {origin: 'CHI', dest: 'HOU', count: 300},
];
```

### Flow Accessor Functions

Tell flowmap.gl how to read your flow data with accessor functions:

```typescript
new FlowmapLayer({
  // ...
  getFlowOriginId: (flow) => flow.origin,
  getFlowDestId: (flow) => flow.dest,
  getFlowMagnitude: (flow) => flow.count,
});
```

## Complete Example

```typescript
import {FlowmapLayer} from '@flowmap.gl/layers';

const data = {
  locations: [
    {id: 'NYC', name: 'New York', lat: 40.7128, lon: -74.0060},
    {id: 'LA', name: 'Los Angeles', lat: 34.0522, lon: -118.2437},
    {id: 'CHI', name: 'Chicago', lat: 41.8781, lon: -87.6298},
  ],
  flows: [
    {origin: 'NYC', dest: 'LA', count: 1200},
    {origin: 'NYC', dest: 'CHI', count: 850},
    {origin: 'LA', dest: 'CHI', count: 500},
  ],
};

const layer = new FlowmapLayer({
  id: 'flowmap-layer',
  data,
  getLocationId: (loc) => loc.id,
  getLocationLat: (loc) => loc.lat,
  getLocationLon: (loc) => loc.lon,
  getLocationName: (loc) => loc.name,
  getFlowOriginId: (flow) => flow.origin,
  getFlowDestId: (flow) => flow.dest,
  getFlowMagnitude: (flow) => flow.count,
});
```

## Loading Data from CSV

A common pattern is loading data from CSV files:

```typescript
import Papa from 'papaparse';

// locations.csv:
// id,name,lat,lon
// NYC,New York,40.7128,-74.0060
// LA,Los Angeles,34.0522,-118.2437

// flows.csv:
// origin,dest,count
// NYC,LA,1200
// NYC,CHI,850

async function loadData() {
  const [locationsResponse, flowsResponse] = await Promise.all([
    fetch('/data/locations.csv'),
    fetch('/data/flows.csv'),
  ]);

  const locationsText = await locationsResponse.text();
  const flowsText = await flowsResponse.text();

  const locations = Papa.parse(locationsText, {
    header: true,
    dynamicTyping: true,
  }).data;

  const flows = Papa.parse(flowsText, {
    header: true,
    dynamicTyping: true,
  }).data;

  return {locations, flows};
}
```

## Loading Data from JSON

```typescript
// data.json
{
  "locations": [
    {"id": "NYC", "name": "New York", "lat": 40.7128, "lon": -74.0060},
    {"id": "LA", "name": "Los Angeles", "lat": 34.0522, "lon": -118.2437}
  ],
  "flows": [
    {"origin": "NYC", "dest": "LA", "count": 1200}
  ]
}

// Loading
const response = await fetch('/data.json');
const data = await response.json();
```

## Custom Field Names

Your data doesn't need to use specific field names. The accessor functions let you map any structure:

```typescript
// Data with custom field names
const locations = [
  {location_code: 'NYC', display_name: 'New York', latitude: 40.7128, longitude: -74.0060},
];

const flows = [
  {from_location: 'NYC', to_location: 'LA', passenger_count: 1200},
];

// Map custom fields with accessors
new FlowmapLayer({
  data: {locations, flows},
  getLocationId: (loc) => loc.location_code,
  getLocationLat: (loc) => loc.latitude,
  getLocationLon: (loc) => loc.longitude,
  getLocationName: (loc) => loc.display_name,
  getFlowOriginId: (flow) => flow.from_location,
  getFlowDestId: (flow) => flow.to_location,
  getFlowMagnitude: (flow) => flow.passenger_count,
});
```

## Pre-computed Clusters

For large datasets, you can provide pre-computed cluster levels to improve performance. See the [Clustering](/docs/api/clustering) documentation for details.

```typescript
const data = {
  locations,
  flows,
  clusterLevels: [
    {
      zoom: 4,
      nodes: [
        {id: 'cluster-1', lat: 40.0, lon: -90.0, children: ['NYC', 'CHI']},
        // ...
      ],
    },
    // ...
  ],
};
```
