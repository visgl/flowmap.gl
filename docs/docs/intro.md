---
sidebar_position: 1
---

# Introduction

flowmap.gl is a flow map drawing layer for [deck.gl](https://deck.gl). It can be used for visualizing movement of people (e.g. migration), goods, or any other type of flow between geographic locations. The layer is rendered in WebGL and can handle large numbers of flows with good rendering performance.

## Features

- **WebGL Rendering**: Smooth, hardware-accelerated visualization of thousands of flows
- **Automatic Clustering**: Nearby locations cluster at lower zoom levels for clarity
- **Animation Support**: Optional animated particles along flow lines
- **Interactive**: Hover and click handlers for locations and flows
- **Customizable**: 40+ color schemes, dark/light mode, and extensive styling options
- **Framework Agnostic**: Works with React, Svelte, Vue, or vanilla JavaScript

## Quick Install

```bash
npm install @flowmap.gl/layers @flowmap.gl/data deck.gl
```

## Minimal Example

```tsx
import {FlowmapLayer} from '@flowmap.gl/layers';
import DeckGL from '@deck.gl/react';

const layer = new FlowmapLayer({
  id: 'flowmap',
  data: {
    locations: [
      {id: 'A', lat: 40.7, lon: -74.0},
      {id: 'B', lat: 34.0, lon: -118.2},
    ],
    flows: [
      {origin: 'A', dest: 'B', count: 1000},
    ],
  },
  getLocationId: (loc) => loc.id,
  getLocationLat: (loc) => loc.lat,
  getLocationLon: (loc) => loc.lon,
  getFlowOriginId: (flow) => flow.origin,
  getFlowDestId: (flow) => flow.dest,
  getFlowMagnitude: (flow) => flow.count,
});

<DeckGL
  initialViewState={{longitude: -95, latitude: 38, zoom: 4}}
  controller={true}
  layers={[layer]}
/>
```

## Live Demo

Try the [interactive demo](https://visgl.github.io/flowmap.gl/) to see flowmap.gl in action.

## No-Code Options

If you don't need to write code, check out these tools built with flowmap.gl:

- [FlowmapBlue](https://flowmap.blue/) - Create flow maps from Google Sheets
- [Flowmap City](https://flowmap.city/) - Urban mobility flow visualization

## Example Projects

Explore the source code of these example implementations:

- [React example](https://github.com/visgl/flowmap.gl/tree/main/examples/react-app) - Full React + react-map-gl setup
- [React worker example](https://github.com/visgl/flowmap.gl/tree/main/examples/react-worker-app) - Large datasets with Web Worker
- [Vanilla JS example](https://github.com/visgl/flowmap.gl/tree/main/examples/vite-app) - Pure JavaScript with Vite
- [Svelte example](https://github.com/visgl/flowmap.gl/tree/main/examples/svelte-app) - Svelte integration

## Next Steps

- [Getting Started](/docs/getting-started) - Installation and setup
- [Data Format](/docs/data-format) - Structure your data
- [FlowmapLayer API](/docs/api/flowmap-layer) - Complete props reference
