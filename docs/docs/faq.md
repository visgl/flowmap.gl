---
sidebar_position: 10
---

# FAQ

Common questions and troubleshooting tips for flowmap.gl.

## General Questions

### What is flowmap.gl?

flowmap.gl is a WebGL-powered layer for [deck.gl](https://deck.gl) that visualizes movement between geographic locations. It renders flows as curved lines and locations as circles, with support for clustering, animation, and interactive features.

### What data formats are supported?

flowmap.gl accepts any object structure for locations and flows. You provide accessor functions to extract the required fields (id, lat, lon, origin, dest, count). See [Data Format](/docs/data-format) for details.

### Do I need a Mapbox token?

Only if you want a background map. flowmap.gl works with deck.gl directly and can render flows without any base map:

```typescript
<DeckGL layers={[flowmapLayer]} controller={true}>
  {/* No map component needed */}
</DeckGL>
```

To add a map, you'll need a token from [Mapbox](https://www.mapbox.com/) or use [MapLibre](https://maplibre.org/) with free tiles.

## Performance

### My map is slow with many flows

Try these optimizations:

1. **Limit displayed flows** with `maxTopFlowsDisplayNum`:
   ```typescript
   new FlowmapLayer({
     maxTopFlowsDisplayNum: 3000,  // Show only top 3000 flows
   });
   ```

2. **Enable clustering** (on by default):
   ```typescript
   new FlowmapLayer({
     clusteringEnabled: true,
     clusteringAuto: true,
   });
   ```

3. **Disable animation** if not needed:
   ```typescript
   new FlowmapLayer({
     animationEnabled: false,
   });
   ```

4. **Use a Web Worker** for large datasets (see react-worker-app example)

### How many flows can flowmap.gl handle?

Performance depends on hardware, but typical guidelines:

| Flow Count | Performance |
|------------|-------------|
| < 5,000 | Smooth on most devices |
| 5,000 - 20,000 | Good with clustering enabled |
| 20,000 - 100,000 | Consider Web Worker, limit displayed flows |
| > 100,000 | Definitely use Web Worker, pre-compute clusters |

### Why does zooming feel sluggish?

This often happens when `adaptiveScalesEnabled: true` (default) recalculates scales on each zoom. For very large datasets:

```typescript
new FlowmapLayer({
  adaptiveScalesEnabled: false,  // Use fixed scales
});
```

## Visual Issues

### Flows are not visible

Check these common issues:

1. **Data format**: Ensure accessor functions match your data structure:
   ```typescript
   // If your data uses 'source' instead of 'origin':
   getFlowOriginId: (flow) => flow.source,  // Not flow.origin
   ```

2. **Location coordinates**: Verify lat/lon are numbers, not strings:
   ```typescript
   // Wrong - strings from CSV
   {lat: "40.7128", lon: "-74.0060"}

   // Correct - numbers
   {lat: 40.7128, lon: -74.0060}
   ```

3. **Flow magnitude**: Ensure counts are positive numbers:
   ```typescript
   getFlowMagnitude: (flow) => Math.abs(flow.count),
   ```

### Colors look wrong in dark/light mode

The `darkMode` prop affects color scheme direction:

```typescript
// If using a dark background map but colors seem inverted:
new FlowmapLayer({
  darkMode: true,  // Make sure this matches your map style
});
```

### Flows appear behind the map

Set the proper blend mode and layer order:

```typescript
<DeckGL
  style={{mixBlendMode: darkMode ? 'screen' : 'darken'}}
  layers={[flowmapLayer]}
>
  <Map style={mapStyle} />
</DeckGL>
```

### Circles are not showing

Enable location display:

```typescript
new FlowmapLayer({
  locationsEnabled: true,        // Show location circles
  locationTotalsEnabled: true,   // Show in/out totals as concentric circles
});
```

## Events and Interaction

### onHover is not firing

Make sure `pickable: true` is set:

```typescript
new FlowmapLayer({
  pickable: true,  // Required for hover/click events
  onHover: (info) => { ... },
});
```

### How do I get location totals?

Totals are included in the picking info for locations:

```typescript
onHover: (info) => {
  if (info?.object?.type === 'location') {
    const {incomingCount, outgoingCount, internalCount} = info.object.totals;
  }
}
```

### How do I filter flows by selected location?

Use the `filter` prop:

```typescript
import {LocationFilterMode} from '@flowmap.gl/data';

new FlowmapLayer({
  filter: {
    selectedLocations: ['NYC', 'LA'],
    locationFilterMode: LocationFilterMode.BETWEEN,
  },
});
```

Filter modes:
- `ALL` - Show all flows
- `INCOMING` - Only flows to selected locations
- `OUTGOING` - Only flows from selected locations
- `BETWEEN` - Only flows between selected locations

## Clustering

### How do I disable clustering?

```typescript
new FlowmapLayer({
  clusteringEnabled: false,
});
```

### Clusters have wrong positions

If using pre-computed clusters, ensure coordinates represent the cluster center:

```typescript
{
  id: 'cluster-1',
  lat: 40.5,  // Should be centroid of member locations
  lon: -73.5,
  children: ['NYC', 'BOS', 'PHL'],
}
```

### Can I customize cluster names?

When using automatic clustering, names are generated automatically. For custom names, provide pre-computed cluster levels:

```typescript
const data = {
  locations,
  flows,
  clusterLevels: [{
    zoom: 4,
    nodes: [{
      id: 'east-coast',
      name: 'East Coast Region',  // Custom name
      lat: 40.5,
      lon: -73.5,
      children: ['NYC', 'BOS', 'PHL'],
    }],
  }],
};
```

## TypeScript

### How do I type my location/flow objects?

Use generics with FlowmapLayer:

```typescript
interface Location {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface Flow {
  origin: string;
  dest: string;
  count: number;
}

new FlowmapLayer<Location, Flow>({
  data: {locations, flows},
  // TypeScript now enforces correct accessor types
});
```

### Type errors with picking info

Import and use the PickingType enum:

```typescript
import {FlowmapLayerPickingInfo, PickingType} from '@flowmap.gl/layers';

onHover: (info: FlowmapLayerPickingInfo<Location, Flow> | undefined) => {
  if (info?.object?.type === PickingType.LOCATION) {
    // TypeScript knows info.object has location properties
  }
}
```

## Debugging

### How do I debug data issues?

Log the data to verify structure:

```typescript
console.log('Locations:', data.locations);
console.log('Flows:', data.flows);
console.log('Sample location:', data.locations[0]);
console.log('Sample flow:', data.flows[0]);
```

### Check accessor functions:

```typescript
const loc = data.locations[0];
console.log('Location ID:', getLocationId(loc));
console.log('Location coords:', getLocationLat(loc), getLocationLon(loc));

const flow = data.flows[0];
console.log('Flow:', getFlowOriginId(flow), '→', getFlowDestId(flow));
console.log('Magnitude:', getFlowMagnitude(flow));
```

### View layer state:

In browser dev tools, you can inspect the deck.gl layer:

```typescript
const layer = new FlowmapLayer({...});
console.log('Layer props:', layer.props);
console.log('Layer state:', layer.state);
```

## Migration

### Upgrading from v7 to v8

Key changes in v8:
- Updated to deck.gl 9.x
- Package structure changed to `@flowmap.gl/layers` and `@flowmap.gl/data`
- Import paths updated

```typescript
// v7
import FlowmapLayer from '@flowmap.gl/core';

// v8
import {FlowmapLayer} from '@flowmap.gl/layers';
import {getViewStateForLocations} from '@flowmap.gl/data';
```
