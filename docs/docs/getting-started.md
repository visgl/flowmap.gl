---
sidebar_position: 2
---

# Getting Started

This guide will help you get up and running with flowmap.gl quickly.

## Installation

Install flowmap.gl packages along with the required peer dependencies:

```bash
# Using npm
npm install @flowmap.gl/layers @flowmap.gl/data deck.gl

# Using yarn
yarn add @flowmap.gl/layers @flowmap.gl/data deck.gl
```

### Peer Dependencies

flowmap.gl requires the following peer dependencies:

| Package | Version | Purpose |
|---------|---------|---------|
| `deck.gl` | ^9.0.0 | WebGL-powered visualization framework |
| `react` | ^18.0.0 | Required for React integration |
| `react-dom` | ^18.0.0 | Required for React integration |
| `mapbox-gl` or `maplibre-gl` | ^2.0.0 | Background map (optional) |

## Quick Start

Here's a minimal example to render a flow map:

```tsx
import {FlowmapLayer} from '@flowmap.gl/layers';
import DeckGL from '@deck.gl/react';

// Define your location and flow data
const locations = [
  {id: 'NYC', name: 'New York', lat: 40.7128, lon: -74.0060},
  {id: 'LA', name: 'Los Angeles', lat: 34.0522, lon: -118.2437},
  {id: 'CHI', name: 'Chicago', lat: 41.8781, lon: -87.6298},
];

const flows = [
  {origin: 'NYC', dest: 'LA', count: 1200},
  {origin: 'NYC', dest: 'CHI', count: 850},
  {origin: 'LA', dest: 'CHI', count: 500},
];

function App() {
  const layers = [
    new FlowmapLayer({
      id: 'flowmap-layer',
      data: {locations, flows},
      getLocationId: (loc) => loc.id,
      getLocationLat: (loc) => loc.lat,
      getLocationLon: (loc) => loc.lon,
      getFlowOriginId: (flow) => flow.origin,
      getFlowDestId: (flow) => flow.dest,
      getFlowMagnitude: (flow) => flow.count,
    }),
  ];

  return (
    <DeckGL
      initialViewState={{
        longitude: -95,
        latitude: 39,
        zoom: 4,
      }}
      controller={true}
      layers={layers}
    />
  );
}
```

## Understanding the Data

flowmap.gl requires two pieces of data:

1. **Locations**: Geographic points with unique IDs and coordinates
2. **Flows**: Movement records between locations with magnitude

See the [Data Format](/docs/data-format) guide for detailed information about structuring your data.

## Next Steps

- [Data Format](/docs/data-format) - Learn how to structure your data
- [FlowmapLayer API](/docs/api/flowmap-layer) - Complete props reference
- [React Integration](/docs/guides/react-integration) - Full React example with tooltips
- [Color Schemes](/docs/api/color-schemes) - Customize your flow map appearance
