---
sidebar_position: 1
---

# React Integration

This guide shows how to integrate flowmap.gl with React and react-map-gl for a full-featured flow map application.

## Prerequisites

Install the required dependencies:

```bash
npm install @flowmap.gl/layers @flowmap.gl/data deck.gl @deck.gl/react react-map-gl mapbox-gl
```

## Basic Setup

```tsx
import {useState, useEffect} from 'react';
import DeckGL from '@deck.gl/react';
import {Map} from 'react-map-gl';
import {FlowmapLayer} from '@flowmap.gl/layers';
import {getViewStateForLocations} from '@flowmap.gl/data';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'your-mapbox-token';

function App() {
  const [viewState, setViewState] = useState({
    longitude: -95,
    latitude: 39,
    zoom: 4,
  });

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

  const layers = [
    new FlowmapLayer({
      id: 'flowmap-layer',
      data,
      pickable: true,
      getLocationId: (loc) => loc.id,
      getLocationLat: (loc) => loc.lat,
      getLocationLon: (loc) => loc.lon,
      getLocationName: (loc) => loc.name,
      getFlowOriginId: (flow) => flow.origin,
      getFlowDestId: (flow) => flow.dest,
      getFlowMagnitude: (flow) => flow.count,
    }),
  ];

  return (
    <DeckGL
      viewState={viewState}
      onViewStateChange={({viewState}) => setViewState(viewState)}
      controller={true}
      layers={layers}
    >
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v10"
      />
    </DeckGL>
  );
}
```

## Auto-fit View to Data

Use `getViewStateForLocations` to automatically calculate a view that fits all locations:

```tsx
import {getViewStateForLocations} from '@flowmap.gl/data';

function App() {
  const [viewState, setViewState] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Load your data
    fetchData().then((data) => {
      setData(data);

      // Calculate view state to fit all locations
      const [width, height] = [window.innerWidth, window.innerHeight];
      const initialViewState = getViewStateForLocations(
        data.locations,
        (loc) => [loc.lon, loc.lat],
        [width, height],
        {pad: 0.3}  // 30% padding around the bounds
      );

      setViewState(initialViewState);
    });
  }, []);

  if (!viewState || !data) {
    return <div>Loading...</div>;
  }

  // ... rest of component
}
```

## Adding Tooltips

Implement tooltips by tracking hover state:

```tsx
import {useState} from 'react';
import {FlowmapLayer, PickingType} from '@flowmap.gl/layers';

function App() {
  const [tooltip, setTooltip] = useState(null);

  const layers = [
    new FlowmapLayer({
      id: 'flowmap-layer',
      data,
      pickable: true,
      // ... accessors
      onHover: (info) => {
        if (!info?.object) {
          setTooltip(null);
          return;
        }

        const {x, y, object} = info;
        setTooltip({x, y, object});
      },
    }),
  ];

  return (
    <div style={{position: 'relative'}}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({viewState}) => setViewState(viewState)}
        controller={true}
        layers={layers}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v10"
        />
      </DeckGL>

      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        >
          <TooltipContent object={tooltip.object} />
        </div>
      )}
    </div>
  );
}

function TooltipContent({object}) {
  switch (object.type) {
    case PickingType.LOCATION:
      return (
        <div>
          <strong>{object.name}</strong>
          <div>Incoming: {object.totals.incomingCount.toLocaleString()}</div>
          <div>Outgoing: {object.totals.outgoingCount.toLocaleString()}</div>
          <div>Internal: {object.totals.internalCount.toLocaleString()}</div>
        </div>
      );

    case PickingType.FLOW:
      return (
        <div>
          <div>{object.origin.name || object.origin.id} → {object.dest.name || object.dest.id}</div>
          <div>{object.count.toLocaleString()}</div>
        </div>
      );

    default:
      return null;
  }
}
```

## Complete Example with Controls

Here's a full example with UI controls for common settings:

```tsx
import {useState, useEffect, useMemo} from 'react';
import DeckGL from '@deck.gl/react';
import {Map} from 'react-map-gl';
import {FlowmapLayer, PickingType} from '@flowmap.gl/layers';
import {getViewStateForLocations} from '@flowmap.gl/data';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = 'your-mapbox-token';

function App() {
  const [viewState, setViewState] = useState(null);
  const [data, setData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // Settings
  const [darkMode, setDarkMode] = useState(true);
  const [colorScheme, setColorScheme] = useState('Teal');
  const [animationEnabled, setAnimationEnabled] = useState(false);
  const [clusteringEnabled, setClusteringEnabled] = useState(true);

  useEffect(() => {
    fetchData().then((data) => {
      setData(data);
      const [width, height] = [window.innerWidth, window.innerHeight];
      setViewState(
        getViewStateForLocations(
          data.locations,
          (loc) => [loc.lon, loc.lat],
          [width, height]
        )
      );
    });
  }, []);

  const layers = useMemo(() => {
    if (!data) return [];

    return [
      new FlowmapLayer({
        id: 'flowmap-layer',
        data,
        pickable: true,

        // Display settings
        darkMode,
        colorScheme,
        animationEnabled,
        clusteringEnabled,
        fadeAmount: 50,
        highlightColor: 'orange',

        // Accessors
        getLocationId: (loc) => loc.id,
        getLocationLat: (loc) => loc.lat,
        getLocationLon: (loc) => loc.lon,
        getLocationName: (loc) => loc.name,
        getFlowOriginId: (flow) => flow.origin,
        getFlowDestId: (flow) => flow.dest,
        getFlowMagnitude: (flow) => flow.count,

        // Events
        onHover: (info) => {
          setTooltip(info?.object ? {x: info.x, y: info.y, object: info.object} : null);
        },
      }),
    ];
  }, [data, darkMode, colorScheme, animationEnabled, clusteringEnabled]);

  if (!viewState || !data) {
    return <div>Loading...</div>;
  }

  return (
    <div className={darkMode ? 'dark' : 'light'} style={{position: 'relative', width: '100vw', height: '100vh'}}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({viewState}) => {
          setViewState(viewState);
          setTooltip(null);
        }}
        controller={true}
        layers={layers}
        style={{mixBlendMode: darkMode ? 'screen' : 'darken'}}
      >
        <Map
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={darkMode
            ? 'mapbox://styles/mapbox/dark-v10'
            : 'mapbox://styles/mapbox/light-v10'
          }
        />
      </DeckGL>

      {/* Controls */}
      <div style={{position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 4}}>
        <label style={{display: 'block', color: 'white', marginBottom: 8}}>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
          {' '}Dark Mode
        </label>
        <label style={{display: 'block', color: 'white', marginBottom: 8}}>
          <input
            type="checkbox"
            checked={animationEnabled}
            onChange={(e) => setAnimationEnabled(e.target.checked)}
          />
          {' '}Animation
        </label>
        <label style={{display: 'block', color: 'white', marginBottom: 8}}>
          <input
            type="checkbox"
            checked={clusteringEnabled}
            onChange={(e) => setClusteringEnabled(e.target.checked)}
          />
          {' '}Clustering
        </label>
        <label style={{display: 'block', color: 'white'}}>
          Color Scheme:{' '}
          <select
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
          >
            <option value="Teal">Teal</option>
            <option value="Blues">Blues</option>
            <option value="Greens">Greens</option>
            <option value="Oranges">Oranges</option>
            <option value="Reds">Reds</option>
            <option value="Purples">Purples</option>
          </select>
        </label>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 10,
            top: tooltip.y + 10,
            background: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            pointerEvents: 'none',
            fontSize: '14px',
          }}
        >
          {tooltip.object.type === PickingType.LOCATION ? (
            <>
              <div style={{fontWeight: 'bold'}}>{tooltip.object.name}</div>
              <div>In: {tooltip.object.totals.incomingCount.toLocaleString()}</div>
              <div>Out: {tooltip.object.totals.outgoingCount.toLocaleString()}</div>
            </>
          ) : tooltip.object.type === PickingType.FLOW ? (
            <>
              <div>{tooltip.object.origin.name} → {tooltip.object.dest.name}</div>
              <div>{tooltip.object.count.toLocaleString()}</div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

async function fetchData() {
  // Replace with your data loading logic
  return {
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
}

export default App;
```

## Tips

### Performance with Large Datasets

For better performance with large datasets:

1. Use `maxTopFlowsDisplayNum` to limit displayed flows
2. Enable clustering with `clusteringEnabled: true`
3. Consider using a Web Worker (see the react-worker-app example)

### Styling for Dark/Light Mode

Use CSS `mix-blend-mode` on the DeckGL component for better visual results:

```tsx
<DeckGL
  style={{mixBlendMode: darkMode ? 'screen' : 'darken'}}
  // ...
>
```

### TypeScript Types

Import types for better TypeScript support:

```typescript
import {
  FlowmapLayer,
  FlowmapLayerPickingInfo,
  PickingType,
} from '@flowmap.gl/layers';

import {
  FlowmapData,
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

// Use with FlowmapLayer
new FlowmapLayer<Location, Flow>({
  // TypeScript will now enforce correct accessor types
});
```
