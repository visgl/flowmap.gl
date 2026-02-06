---
sidebar_position: 1
---

# FlowmapLayer

The `FlowmapLayer` is the main layer class for rendering flow maps. It extends deck.gl's `CompositeLayer` and renders flows as curved lines and locations as circles.

## Basic Usage

```typescript
import {FlowmapLayer} from '@flowmap.gl/layers';

const layer = new FlowmapLayer({
  id: 'flowmap-layer',
  data: {locations, flows},
  getLocationId: (loc) => loc.id,
  getLocationLat: (loc) => loc.lat,
  getLocationLon: (loc) => loc.lon,
  getFlowOriginId: (flow) => flow.origin,
  getFlowDestId: (flow) => flow.dest,
  getFlowMagnitude: (flow) => flow.count,
});
```

## Props Reference

### Data Props

#### `data`

- Type: `FlowmapData<L, F>`
- Required (or `dataProvider`)

The data object containing locations and flows:

```typescript
{
  locations: Iterable<L>;
  flows: Iterable<F>;
  clusterLevels?: ClusterLevels;
}
```

#### `dataProvider`

- Type: `FlowmapDataProvider<L, F>`
- Required (or `data`)

Alternative to `data` for advanced use cases. A data provider allows for custom data loading strategies.

#### `filter`

- Type: `FilterState`
- Default: `undefined`

Filter state to control which flows are displayed:

```typescript
interface FilterState {
  selectedLocations?: (string | number)[];
  locationFilterMode?: LocationFilterMode;  // 'ALL' | 'INCOMING' | 'OUTGOING' | 'BETWEEN'
  selectedTimeRange?: [Date, Date];
}
```

### Display Props

#### `darkMode`

- Type: `boolean`
- Default: `true`

Whether to use dark mode colors. When `true`, the color scheme is reversed and location circles use dark backgrounds.

#### `colorScheme`

- Type: `string | string[]`
- Default: `'Teal'`

The color scheme for flows. Can be a preset name (see [Color Schemes](/docs/api/color-schemes)) or a custom array of colors:

```typescript
// Use a preset
colorScheme: 'Blues'

// Use a custom scheme
colorScheme: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#3182bd', '#08519c']
```

#### `fadeAmount`

- Type: `number`
- Default: `50`

Controls how much lower-magnitude flows fade compared to higher ones. Range: 0-100. Higher values create more contrast between high and low magnitude flows.

#### `highlightColor`

- Type: `string | number[]`
- Default: `'orange'`

Color used for highlighting hovered elements. Can be a CSS color string or RGBA array:

```typescript
highlightColor: 'orange'
highlightColor: [255, 165, 0, 255]
```

#### `opacity`

- Type: `number`
- Default: `1`

Overall layer opacity. Range: 0-1.

### Feature Toggles

#### `locationsEnabled`

- Type: `boolean`
- Default: `true`

Whether to show location circles.

#### `locationTotalsEnabled`

- Type: `boolean`
- Default: `true`

Whether to show incoming/outgoing totals as concentric circles at each location.

#### `locationLabelsEnabled`

- Type: `boolean`
- Default: `false`

Whether to show text labels at locations.

#### `animationEnabled`

- Type: `boolean`
- Default: `false`

Whether to animate the flows with moving particles along the lines.

#### `clusteringEnabled`

- Type: `boolean`
- Default: `true`

Whether to cluster nearby locations when zoomed out.

#### `clusteringAuto`

- Type: `boolean`
- Default: `true`

Whether to automatically adjust clustering level based on zoom. When `false`, use `clusteringLevel` to set a fixed level.

#### `clusteringLevel`

- Type: `number`
- Default: `undefined`

Fixed clustering zoom level. Only used when `clusteringAuto` is `false`.

#### `fadeEnabled`

- Type: `boolean`
- Default: `true`

Whether to apply color fading to lower-magnitude flows.

#### `fadeOpacityEnabled`

- Type: `boolean`
- Default: `false`

Whether to also fade opacity (in addition to color) for lower-magnitude flows.

#### `adaptiveScalesEnabled`

- Type: `boolean`
- Default: `true`

Whether to adapt flow thickness and color scales to the current viewport. When `true`, scales adjust as you pan/zoom to always show meaningful variation.

### Performance

#### `maxTopFlowsDisplayNum`

- Type: `number`
- Default: `5000`

Maximum number of flows to display. Flows are sorted by magnitude and only the top N are shown. Increase for denser visualizations (may impact performance).

#### `flowEndpointsInViewportMode`

- Type: `'any' | 'both'`
- Default: `'any'`

Controls when a flow is considered visible based on endpoint locations:
- `'any'`: Show flows if at least one endpoint (origin OR destination) is in viewport
- `'both'`: Show flows only if both endpoints (origin AND destination) are in viewport

The `'both'` mode is useful for stricter local views where you only want to see flows fully contained in the visible area.

### Event Handlers

#### `onHover`

- Type: `(info: FlowmapLayerPickingInfo | undefined, event: SourceEvent) => void`

Callback fired when hovering over locations or flows:

```typescript
onHover: (info) => {
  if (info?.object) {
    switch (info.object.type) {
      case 'location':
        console.log('Hovered location:', info.object.name);
        console.log('Totals:', info.object.totals);
        break;
      case 'flow':
        console.log('Hovered flow:', info.object.origin.id, '→', info.object.dest.id);
        console.log('Count:', info.object.count);
        break;
    }
  }
}
```

#### `onClick`

- Type: `(info: FlowmapLayerPickingInfo, event: SourceEvent) => void`

Callback fired when clicking on locations or flows:

```typescript
onClick: (info) => {
  if (info.object?.type === 'location') {
    console.log('Clicked location:', info.object.id);
  }
}
```

### Accessor Props

These functions tell the layer how to read your data:

#### Location Accessors

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `getLocationId` | `(loc: L) => string \| number` | Yes | Returns unique location identifier |
| `getLocationLat` | `(loc: L) => number` | Yes | Returns latitude |
| `getLocationLon` | `(loc: L) => number` | Yes | Returns longitude |
| `getLocationName` | `(loc: L) => string` | No | Returns display name |

#### Flow Accessors

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `getFlowOriginId` | `(flow: F) => string \| number` | Yes | Returns origin location ID |
| `getFlowDestId` | `(flow: F) => string \| number` | Yes | Returns destination location ID |
| `getFlowMagnitude` | `(flow: F) => number` | Yes | Returns flow magnitude/count |

## PickingInfo Types

The `onHover` and `onClick` callbacks receive a `FlowmapLayerPickingInfo` object:

### Location Picking Info

```typescript
{
  type: 'location';
  location: L;              // Original location object
  id: string | number;      // Location ID
  name: string;             // Location name
  totals: {
    incomingCount: number;  // Total incoming flow
    outgoingCount: number;  // Total outgoing flow
    internalCount: number;  // Internal/self flows
  };
  circleRadius: number;     // Rendered circle radius in pixels
}
```

### Flow Picking Info

```typescript
{
  type: 'flow';
  flow: F;                  // Original flow object
  origin: L;                // Origin location object
  dest: L;                  // Destination location object
  count: number;            // Flow magnitude
}
```

## Full Example

```typescript
import {FlowmapLayer, FlowmapLayerPickingInfo, PickingType} from '@flowmap.gl/layers';

const layer = new FlowmapLayer({
  id: 'flowmap-layer',
  data: {locations, flows},

  // Accessors
  getLocationId: (loc) => loc.id,
  getLocationLat: (loc) => loc.lat,
  getLocationLon: (loc) => loc.lon,
  getLocationName: (loc) => loc.name,
  getFlowOriginId: (flow) => flow.origin,
  getFlowDestId: (flow) => flow.dest,
  getFlowMagnitude: (flow) => flow.count,

  // Display
  pickable: true,
  darkMode: true,
  colorScheme: 'Teal',
  fadeAmount: 50,
  highlightColor: 'orange',

  // Features
  animationEnabled: false,
  clusteringEnabled: true,
  clusteringAuto: true,
  locationTotalsEnabled: true,

  // Events
  onHover: (info) => {
    if (info?.object?.type === PickingType.LOCATION) {
      console.log('Location:', info.object.name);
    }
  },
  onClick: (info) => {
    console.log('Clicked:', info.object);
  },
});
```
