---
sidebar_position: 4
---

# TypeScript Types

This page documents the main TypeScript types used in flowmap.gl.

## Core Data Types

### FlowmapData

The main data structure for the FlowmapLayer:

```typescript
interface FlowmapData<L, F> {
  locations: Iterable<L>;           // Array or iterable of locations
  flows: Iterable<F>;               // Array or iterable of flows
  clusterLevels?: ClusterLevels;    // Optional pre-computed clusters
}
```

**Type Parameters:**
- `L` - The shape of your location objects
- `F` - The shape of your flow objects

**Example:**
```typescript
interface MyLocation {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface MyFlow {
  origin: string;
  dest: string;
  count: number;
}

const data: FlowmapData<MyLocation, MyFlow> = {
  locations: [...],
  flows: [...],
};
```

### ViewState

Viewport state for map positioning:

```typescript
interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  altitude?: number;
}
```

### ViewportProps

Extended viewport properties:

```typescript
interface ViewportProps {
  width: number;
  height: number;
  latitude: number;
  longitude: number;
  zoom?: number;
  bearing?: number;
  pitch?: number;
  altitude?: number;
  maxZoom?: number;
  minZoom?: number;
  maxPitch?: number;
  minPitch?: number;
  transitionDuration?: number | 'auto';
  transitionInterpolator?: any;
  transitionInterruption?: any;
  transitionEasing?: any;
}
```

## Accessor Types

### LocationAccessors

Functions to extract data from location objects:

```typescript
interface LocationAccessors<L> {
  getLocationId: (location: L) => string | number;
  getLocationLat: (location: L) => number;
  getLocationLon: (location: L) => number;
  getLocationName?: (location: L) => string;
  getLocationClusterName?: (locationIds: (string | number)[]) => string;
}
```

### FlowAccessors

Functions to extract data from flow objects:

```typescript
interface FlowAccessors<F> {
  getFlowOriginId: (flow: F) => string | number;
  getFlowDestId: (flow: F) => string | number;
  getFlowMagnitude: (flow: F) => number;
  getFlowTime?: (flow: F) => Date;
}
```

### FlowmapDataAccessors

Combined accessors:

```typescript
type FlowmapDataAccessors<L, F> = LocationAccessors<L> & FlowAccessors<F>;
```

## State Types

### FilterState

Filter configuration:

```typescript
interface FilterState {
  selectedLocations?: (string | number)[];
  locationFilterMode?: LocationFilterMode;
  selectedTimeRange?: [Date, Date];
}
```

### LocationFilterMode

Enum for filtering flows by location:

```typescript
enum LocationFilterMode {
  ALL = 'ALL',           // Show all flows
  INCOMING = 'INCOMING', // Only flows to selected locations
  OUTGOING = 'OUTGOING', // Only flows from selected locations
  BETWEEN = 'BETWEEN',   // Flows between selected locations
}
```

### SettingsState

Display settings:

```typescript
interface SettingsState {
  animationEnabled: boolean;
  fadeEnabled: boolean;
  fadeOpacityEnabled: boolean;
  locationsEnabled: boolean;
  locationTotalsEnabled: boolean;
  locationLabelsEnabled: boolean;
  adaptiveScalesEnabled: boolean;
  clusteringEnabled: boolean;
  clusteringAuto: boolean;
  clusteringLevel?: number;
  darkMode: boolean;
  fadeAmount: number;
  colorScheme: string | string[] | undefined;
  highlightColor: string;
  maxTopFlowsDisplayNum: number;
}
```

### FlowmapState

Complete state combining filter, settings, and viewport:

```typescript
interface FlowmapState {
  filter?: FilterState;
  settings: SettingsState;
  viewport: ViewportProps;
}
```

## Picking Types

### PickingType

Enum identifying what was picked:

```typescript
enum PickingType {
  LOCATION = 'location',
  FLOW = 'flow',
}
```

### LocationTotals

Aggregated flow totals for a location:

```typescript
interface LocationTotals {
  incomingCount: number;   // Total flow into location
  outgoingCount: number;   // Total flow out of location
  internalCount: number;   // Internal/self flows
}
```

### FlowmapLayerPickingInfo

Information returned by onHover and onClick:

```typescript
// For location picks
interface LocationPickingInfo<L> {
  type: PickingType.LOCATION;
  location: L;
  id: string | number;
  name: string;
  totals: LocationTotals;
  circleRadius: number;
  // Plus standard deck.gl picking info: x, y, coordinate, etc.
}

// For flow picks
interface FlowPickingInfo<L, F> {
  type: PickingType.FLOW;
  flow: F;
  origin: L;
  dest: L;
  count: number;
  // Plus standard deck.gl picking info: x, y, coordinate, etc.
}

type FlowmapLayerPickingInfo<L, F> = LocationPickingInfo<L> | FlowPickingInfo<L, F>;
```

## Clustering Types

### ClusterNode

Base type for all nodes in cluster hierarchy:

```typescript
interface ClusterNode {
  id: string | number;
  zoom: number;
  lat: number;
  lon: number;
}
```

### Cluster

A cluster containing multiple locations:

```typescript
interface Cluster extends ClusterNode {
  name?: string;
  children: (string | number)[];  // Child location/cluster IDs
}
```

### ClusterLevel

One level of clustering at a specific zoom:

```typescript
interface ClusterLevel {
  zoom: number;
  nodes: ClusterNode[];
}
```

### ClusterLevels

Array of cluster levels:

```typescript
type ClusterLevels = ClusterLevel[];
```

### Type Guard Functions

```typescript
// Check if a ClusterNode is actually a Cluster
function isCluster(c: ClusterNode): c is Cluster {
  const {children} = c as Cluster;
  return children && children.length > 0;
}

// Check if a location is a ClusterNode
function isLocationClusterNode<L>(l: L | ClusterNode): l is ClusterNode {
  const {zoom} = l as ClusterNode;
  return zoom !== undefined;
}
```

## Aggregate Types

### AggregateFlow

A flow aggregated from multiple source flows:

```typescript
interface AggregateFlow {
  origin: string | number;
  dest: string | number;
  count: number;
  aggregate: true;
}
```

### Type Guard

```typescript
function isAggregateFlow(flow: Record<string, any>): flow is AggregateFlow {
  return flow && flow.aggregate === true;
}
```

## Layer Attribute Types

These are internal types used by the rendering layers:

### FlowCirclesLayerAttributes

```typescript
interface FlowCirclesLayerAttributes {
  length: number;
  attributes: {
    getPosition: LayersDataAttrValues<Float32Array>;
    getColor: LayersDataAttrValues<Uint8Array>;
    getInRadius: LayersDataAttrValues<Float32Array>;
    getOutRadius: LayersDataAttrValues<Float32Array>;
  };
}
```

### FlowLinesLayerAttributes

```typescript
interface FlowLinesLayerAttributes {
  length: number;
  attributes: {
    getSourcePosition: LayersDataAttrValues<Float32Array>;
    getTargetPosition: LayersDataAttrValues<Float32Array>;
    getThickness: LayersDataAttrValues<Float32Array>;
    getColor: LayersDataAttrValues<Uint8Array>;
    getEndpointOffsets: LayersDataAttrValues<Float32Array>;
    getStaggering?: LayersDataAttrValues<Float32Array>;
  };
}
```

### LayersData

```typescript
interface LayersData {
  circleAttributes: FlowCirclesLayerAttributes;
  lineAttributes: FlowLinesLayerAttributes;
  locationLabels?: string[];
}
```

### LayersDataAttrValues

```typescript
type LayersDataAttrValues<T> = {
  value: T;
  size: number;
};
```

## Usage Example

```typescript
import {
  FlowmapLayer,
  FlowmapLayerPickingInfo,
  PickingType,
} from '@flowmap.gl/layers';

import {
  FlowmapData,
  FilterState,
  LocationFilterMode,
  ViewState,
} from '@flowmap.gl/data';

// Define your data types
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

// Type-safe data
const data: FlowmapData<Location, Flow> = {
  locations: [...],
  flows: [...],
};

// Type-safe filter
const filter: FilterState = {
  selectedLocations: ['NYC', 'LA'],
  locationFilterMode: LocationFilterMode.BETWEEN,
};

// Type-safe layer
const layer = new FlowmapLayer<Location, Flow>({
  data,
  filter,
  // TypeScript enforces correct accessor signatures
  getLocationId: (loc) => loc.id,
  getLocationLat: (loc) => loc.lat,
  getLocationLon: (loc) => loc.lon,
  getFlowOriginId: (flow) => flow.origin,
  getFlowDestId: (flow) => flow.dest,
  getFlowMagnitude: (flow) => flow.count,

  // Type-safe event handler
  onHover: (info: FlowmapLayerPickingInfo<Location, Flow> | undefined) => {
    if (info?.object?.type === PickingType.LOCATION) {
      console.log(info.object.name);  // TypeScript knows this exists
    }
  },
});
```
