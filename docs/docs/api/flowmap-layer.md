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

## Legend Widget

`FlowmapLegendWidget` renders the layer's scale state as a deck.gl widget. Pass the `ScaleState` emitted by `onScaleChange` into the widget:

```typescript
import {FlowmapLayer, FlowmapLegendWidget} from '@flowmap.gl/layers';

let scaleState;
let scaleLockEnabled = false;

const layer = new FlowmapLayer({
  id: 'flowmap-layer',
  data: {locations, flows},
  scaleLock: {enabled: scaleLockEnabled},
  onScaleChange: (nextScaleState) => {
    scaleState = nextScaleState;
  },
  // accessors...
});

const legend = new FlowmapLegendWidget({
  scaleState,
  darkMode: true,
  sections: ['flowThickness', 'locationCircles'],
  placement: 'bottom-left',
  showLockControl: true,
  onToggleLock: (locked) => {
    scaleLockEnabled = locked;
  },
});

deck.setProps({
  layers: [layer],
  widgets: [legend],
});
```

When `onScaleChange` fires, update your app state and pass the next `scaleState` to a new or updated `FlowmapLegendWidget`.

`sections` defaults to `['flowThickness', 'locationCircles']`. Use it to render only part of the legend:

```typescript
new FlowmapLegendWidget({
  scaleState,
  sections: ['flowThickness'],
});
```

The scale lock control is optional. By default it renders only when `onToggleLock` is provided; set `showLockControl: false` to hide it even when a toggle handler exists.

Set `darkMode` to match the map/layer theme. The widget uses that value for its default background, foreground, borders, and lock-control colors. It also adds either `flowmap-legend-widget-dark` or `flowmap-legend-widget-light` to the root element.

`placement` is the standard deck.gl widget placement (`'top-left'`, `'top-right'`, `'bottom-left'`, or `'bottom-right'`). When placed at the bottom, the widget reserves space above common basemap attribution controls. Left and right placements also get a small edge offset. Override root margins only if your map needs different spacing:

```typescript
new FlowmapLegendWidget({
  scaleState,
  placement: 'bottom-left',
  style: {
    marginBottom: '56px',
    marginLeft: '20px',
  },
});
```

Use `className` for the widget root and `classNames` for internal slots. Set `unstyled: true` when you want to provide the full presentation layer from your own CSS, such as Tailwind utilities:

```typescript
const legend = new FlowmapLegendWidget({
  scaleState,
  darkMode,
  className: 'rounded bg-zinc-950/80 p-3 text-xs text-white',
  classNames: {
    section: 'space-y-1',
    row: 'grid items-center gap-2',
    line: 'rounded',
    lockButton:
      'mt-3 flex w-full items-center justify-center gap-1 rounded border px-2 py-1',
    lockButtonLocked: 'border-teal-200 bg-teal-200/20',
  },
  unstyled: true,
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
  locationFilterMode?: LocationFilterMode; // 'ALL' | 'INCOMING' | 'OUTGOING' | 'BETWEEN'
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
colorScheme: 'Blues';

// Use a custom scheme
colorScheme: [
  '#f7fbff',
  '#deebf7',
  '#c6dbef',
  '#9ecae1',
  '#6baed6',
  '#3182bd',
  '#08519c',
];
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
highlightColor: 'orange';
highlightColor: [255, 165, 0, 255];
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

#### `flowLinesRenderingMode`

- Type: `'straight' | 'animated-straight' | 'curved'`
- Default: `'straight'`

Controls how flow lines are rendered.

- `'straight'`: static straight half-barbed arrows
- `'animated-straight'`: animated straight flow lines
- `'curved'`: static curved half-barbed arrows for separating overlapping corridors

With deck.gl's experimental `GlobeView`, all three modes follow the sphere's
surface. A great circle is the straight route on a globe, so the modes keep
their flat meaning, measured along the surface:

- `'straight'`: arrows along the great circle. Opposite directions sit side by
  side, separated by the same gap as on the flat map.
- `'animated-straight'`: the same great circle, with the animated pulses. Pulse
  spacing matches the flat map at the same on-screen route length.
- `'curved'`: the great circle bowed to the right of travel, largest mid-route
  and zero at the endpoints. Overlapping corridors get increasing bows from the
  same corridor offsets as the flat map (computed from nearly coinciding great
  circles), scaled by `flowLineCurviness`.

Routes stay on the surface; raised 3D arcs are not supported.

| Mode                          | Flat view                | Globe view                                       |
| ----------------------------- | ------------------------ | ------------------------------------------------ |
| `'straight'`                  | `FlowLinesLayer`         | `CurvedFlowLinesLayer`, without a bow            |
| `'animated-straight'`         | `AnimatedFlowLinesLayer` | `AnimatedFlowLinesLayer`, along the great circle |
| `'curved'`                    | `CurvedFlowLinesLayer`   | `CurvedFlowLinesLayer`, bowed                    |
| Flow highlight in `'curved'`  | `CurvedFlowLinesLayer`   | `CurvedFlowLinesLayer`, bowed                    |
| Flow highlight in other modes | `FlowLinesLayer`         | `CurvedFlowLinesLayer`, without a bow            |

`FlowLinesLayer` has no globe path: on the globe, straight arrows and all
non-curved highlights use `CurvedFlowLinesLayer` without a bow. As a result,
globe straight arrows have the curved layer's arrowhead, which differs slightly
from the flat straight arrowhead. See [Rendering performance](#rendering-performance)
for the cost of each layer.

Generated clusters use spherical distances and weighted spherical centers,
including across the dateline and near the poles. Explicit `clusterLevels` are
honored in both projections. Switching back to a flat view
restores the requested rendering mode and clustering settings. Hidden-side
flows, circles, and labels are clipped, including during picking. Endpoint
visibility follows `flowEndpointsInViewportMode`: globe `'any'` also keeps great-circle
arcs that cross the screen with both endpoints off-screen; `'both'` still requires
both endpoints. Generated cluster selections from the other projection are ignored
while real location selections and supplied-hierarchy selections are retained.
This only changes the effective map filter: `filter.selectedLocations` is controlled
by the caller and is never mutated. Applications should clear or remap generated
cluster selections on projection changes if their selection UI must stay in sync.
An ignored selection becomes effective again when switching back to its projection.

#### `viewId`

- Type: `string` (optional)
- Default: unset

When unset, flat-only setups retain the existing behavior of drawing in every view,
with shared data state derived from the current viewport. If any view is a globe,
an unbound flowmap draws only in the first view to avoid mixing projection-specific
data and shaders. Explicit `viewId` bindings draw and pick only in that view. If
the bound view is temporarily absent, the layer warns and stays hidden until it
returns, without throwing.

A bound flowmap's clustering, visibility, scales, and rendering mode belong to one view.
For simultaneous globe and flat views, create one `FlowmapLayer` per view with a
unique layer ID and matching `viewId`. The layers automatically draw and pick only
in their assigned views, independent of view order. Share the raw data, but use
separate data-provider instances if supplying `dataProvider`.

```typescript
const layers = [
  new FlowmapLayer({...flowProps, id: 'globe-flows', viewId: 'globe'}),
  new FlowmapLayer({...flowProps, id: 'flat-flows', viewId: 'minimap'}),
];
```

Globe depth and culling parameters are defaults; explicit layer or sublayer
`parameters` take precedence.

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

Whether to adapt flow thickness, flow color, and location circle scales to the current viewport. When `true`, scales adjust as you pan/zoom to always show meaningful variation.

#### `scaleLock`

- Type: `{enabled: boolean; domains?: {flowMagnitude?: [number, number]; locationTotals?: [number, number]}}`
- Default: `undefined`

Locks quantitative visual scale domains so pan/zoom/filtering can change what is visible without changing the numeric rulers used for rendering. When enabled, flow thickness, flow color, and location circle radii use the locked domains. Values outside a locked domain are clamped; flows above the locked flow magnitude domain render in red and clamp to the maximum locked thickness, and circles with incoming or outgoing totals above the locked location totals domain render in red with clamped radii.

If `domains` is omitted, `FlowmapLayer` captures the current rendered domains when the lock transitions from disabled to enabled:

```typescript
new FlowmapLayer({
  // ...
  scaleLock: {enabled: true},
});
```

You can also provide domains explicitly:

```typescript
new FlowmapLayer({
  // ...
  scaleLock: {
    enabled: true,
    domains: {
      flowMagnitude: [0, 1000],
      locationTotals: [0, 5000],
    },
  },
});
```

### Performance

#### `maxTopFlowsDisplayNum`

- Type: `number`
- Default: `5000`

Maximum number of flows to display. Flows are sorted by magnitude and only the top N are shown. Increase for denser visualizations (may impact performance).

#### `flowEndpointsInViewportMode`

- Type: `'any' | 'both'`
- Default: `'any'`

Controls when a flow is considered visible based on endpoint locations:

- `'any'`: Show flows if at least one endpoint (origin OR destination) is in viewport; on the globe, also keep arcs crossing the viewport
- `'both'`: Show flows only if both endpoints (origin AND destination) are in viewport

The `'both'` mode is useful for stricter local views where you only want to see flows fully contained in the visible area.

#### Rendering performance

The flow line layers draw every flow as one instance of a fixed mesh, so the
vertex work grows with the number of displayed flows times the vertices per
flow:

| Layer                    | Vertices per flow, flat | Vertices per flow, globe | Used for                              |
| ------------------------ | ----------------------- | ------------------------ | ------------------------------------- |
| `FlowLinesLayer`         | 9 (3 triangles)         | —                        | Flat `'straight'` and flat highlights |
| `AnimatedFlowLinesLayer` | 4 (2 triangles)         | 194 (96 segments)        | `'animated-straight'`                 |
| `CurvedFlowLinesLayer`   | 144 (24 segments)       | 576 (96 segments)        | `'curved'`, and all globe arrows      |

- Flat `'straight'` is the cheapest mode and the default. `FlowLinesLayer` is
  kept for that reason, and so that flat straight arrows look exactly as before.
- Flat `'curved'` has 16 times the vertex work of flat `'straight'`. It also
  computes corridor offsets on the CPU on every viewport change.
- On the globe, every mode uses a 96-segment mesh so that routes follow the
  sphere. Globe arrows have 4 times the vertices of flat curved arrows and 64
  times those of flat straight arrows. The segment count is fixed, not adaptive.
- Globe `'curved'` additionally computes corridor offsets on every viewport
  change, like flat `'curved'`; globe `'straight'` and `'animated-straight'`
  skip this step.
- `maxTopFlowsDisplayNum` bounds all of the above. Lower it first if rendering
  is slow, especially on the globe or on low-end GPUs.

### Event Handlers

#### `onScaleChange`

- Type: `(scaleState: ScaleState | undefined) => void`

Callback fired after layer data is prepared with the effective quantitative scale state. Use this to render an HTML legend, persist locked domains, or sync related UI with the map's flow and location scales.

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
        console.log(
          'Hovered flow:',
          info.object.origin.id,
          '→',
          info.object.dest.id,
        );
        console.log('Count:', info.object.count);
        break;
    }
  }
};
```

#### `onClick`

- Type: `(info: FlowmapLayerPickingInfo, event: SourceEvent) => void`

Callback fired when clicking on locations or flows:

```typescript
onClick: (info) => {
  if (info.object?.type === 'location') {
    console.log('Clicked location:', info.object.id);
  }
};
```

### Accessor Props

These functions tell the layer how to read your data:

#### Location Accessors

| Prop              | Type                           | Required | Description                        |
| ----------------- | ------------------------------ | -------- | ---------------------------------- |
| `getLocationId`   | `(loc: L) => string \| number` | Yes      | Returns unique location identifier |
| `getLocationLat`  | `(loc: L) => number`           | Yes      | Returns latitude                   |
| `getLocationLon`  | `(loc: L) => number`           | Yes      | Returns longitude                  |
| `getLocationName` | `(loc: L) => string`           | No       | Returns display name               |

#### Flow Accessors

| Prop               | Type                            | Required | Description                     |
| ------------------ | ------------------------------- | -------- | ------------------------------- |
| `getFlowOriginId`  | `(flow: F) => string \| number` | Yes      | Returns origin location ID      |
| `getFlowDestId`    | `(flow: F) => string \| number` | Yes      | Returns destination location ID |
| `getFlowMagnitude` | `(flow: F) => number`           | Yes      | Returns flow magnitude/count    |

## PickingInfo Types

The `onHover` and `onClick` callbacks receive a `FlowmapLayerPickingInfo` object:

### Location Picking Info

```typescript
{
  type: 'location';
  location: L; // Original location object
  id: string | number; // Location ID
  name: string; // Location name
  totals: {
    incomingCount: number; // Total incoming flow
    outgoingCount: number; // Total outgoing flow
    internalCount: number; // Internal/self flows
  }
  circleRadius: number; // Rendered circle radius in pixels
}
```

### Flow Picking Info

```typescript
{
  type: 'flow';
  flow: F; // Original flow object
  origin: L; // Origin location object
  dest: L; // Destination location object
  count: number; // Flow magnitude
}
```

## Full Example

```typescript
import {
  FlowmapLayer,
  FlowmapLayerPickingInfo,
  PickingType,
} from '@flowmap.gl/layers';

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
  flowLinesRenderingMode: 'straight',
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

## Flow blending

`blendingMode: 'normal' | 'non-accumulating'` defaults to `'normal'`, preserving
existing rendering. Blending is independent of `fadeEnabled`. The React, React
worker, and vanilla examples explicitly default to `'non-accumulating'`; their
controls can switch back to `'normal'`.

With `'non-accumulating'`, light mode uses per-channel GPU **min** (darken) and
dark mode uses **max** (lighten). Identical overlapping flows do not become
stronger, including at antialiased edges. This applies to straight, animated,
and curved flows, including globe routes. Picking and globe horizon clipping
remain active; highlights retain ordinary blending so they stay visible.

`fadeEnabled` and `fadeAmount` fade weaker flows toward white in light mode and
black in dark mode. `fadeOpacityEnabled` adds further fading. Flow color alpha,
layer `opacity` (including deck.gl's opacity scaling), outline alpha, animation
tails, and antialias coverage are folded into RGB toward that same neutral color:
min/max ignore source/destination alpha blend factors. Output alpha is opaque.

### Separate canvases

Interleaved rendering blends directly against the basemap and needs no canvas
configuration. **Do not clear the interleaved canvas.** With a separate canvas,
clear to opaque white/black and use matching CSS `darken`/`lighten`:

```typescript
import {MapView} from '@deck.gl/core';
import {
  FlowmapLayer,
  getFlowmapCanvasClearColor,
  getFlowmapCanvasStyle,
} from '@flowmap.gl/layers';

const blending = {blendingMode: 'non-accumulating', darkMode: false} as const;
const clearColor = getFlowmapCanvasClearColor(blending);
const view = new MapView({id: 'map', clear: Boolean(clearColor), clearColor});
// Pass views: view and style: getFlowmapCanvasStyle(blending) to Deck/DeckGL.
// GlobeView works the same way. MapLibreOverlay uses view id 'maplibre'.
const layer = new FlowmapLayer({...flowmapProps, ...blending});
```

For imperative `Deck`/`MapLibreOverlay` integrations, update the existing canvas
style when the theme or mode changes; deck.gl's imperative `style` prop is only
applied when creating the canvas:

```typescript
Object.assign(overlay.getCanvas().style, getFlowmapCanvasStyle(blending));
```

React `DeckGL` updates its canvas style automatically.

The clear-color helper returns 0–255 values for a deck.gl **View**, not normalized
WebGL clear values. In normal mode it returns `undefined`; disable the view clear
when returning to normal. The style helper restores the examples' existing
`screen` (dark) / `darken` (light) CSS behavior in normal mode. Its default theme,
like FlowmapLayer's, is dark.

Ensure the canvas and basemap share a CSS blending backdrop: an intervening
stacking context can otherwise leave an opaque white/black rectangle. For
MapLibre's separate overlay, the React example removes the top-left control
container's `z-index` and isolates the map together with its background. Keep
legends and other UI outside the canvas's CSS blending group.

### Visual tradeoffs

- Different hues can combine into a third color because each RGB channel is
  compared independently. This is not a magnitude-preserving color mix.
- White outlines in light mode and black outlines in dark mode are neutral. They
  soften the flow's edge but cannot erase another flow underneath a crossing;
  dense bundles have less separation and arrowheads can merge into them.
- Faint flows can disappear over basemap channels already darker/lighter than
  the flow. The result depends on basemap colors, unlike ordinary transparency.
- A separate canvas composites all its content against the basemap, so highlights
  and location circles may differ from their interleaved appearance. Basemap
  labels sit below the separate flow canvas; interleaved labels can remain above.
