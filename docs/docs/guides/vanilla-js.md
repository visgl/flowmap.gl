---
sidebar_position: 2
---

# Vanilla JavaScript

This guide shows how to use flowmap.gl with vanilla JavaScript (no React).

## Prerequisites

Install the required dependencies:

```bash
npm install @flowmap.gl/layers @flowmap.gl/data @deck.gl/core mapbox-gl
```

## HTML Setup

Create an HTML file with a canvas for deck.gl and a container for the map:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Flowmap.gl</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css" rel="stylesheet" />
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    #map {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    #deck-canvas {
      position: absolute;
      width: 100%;
      height: 100%;
      mix-blend-mode: screen;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <canvas id="deck-canvas"></canvas>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

## JavaScript Implementation

```javascript
import {Deck} from '@deck.gl/core';
import mapboxgl from 'mapbox-gl';
import {FlowmapLayer} from '@flowmap.gl/layers';
import {getViewStateForLocations} from '@flowmap.gl/data';

const MAPBOX_TOKEN = 'your-mapbox-token';

// Sample data
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

// Calculate initial view state
const [width, height] = [window.innerWidth, window.innerHeight];
const INITIAL_VIEW_STATE = getViewStateForLocations(
  data.locations,
  (loc) => [loc.lon, loc.lat],
  [width, height],
  {pad: 0.3}
);

// Initialize Mapbox
const map = new mapboxgl.Map({
  container: 'map',
  accessToken: MAPBOX_TOKEN,
  style: 'mapbox://styles/mapbox/dark-v10',
  interactive: false,  // deck.gl will handle interaction
  center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
  zoom: INITIAL_VIEW_STATE.zoom,
  bearing: INITIAL_VIEW_STATE.bearing || 0,
  pitch: INITIAL_VIEW_STATE.pitch || 0,
});

// Initialize deck.gl
const deck = new Deck({
  canvas: 'deck-canvas',
  width: '100%',
  height: '100%',
  initialViewState: INITIAL_VIEW_STATE,
  controller: true,
  onViewStateChange: ({viewState}) => {
    // Sync Mapbox with deck.gl view state
    map.jumpTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      bearing: viewState.bearing,
      pitch: viewState.pitch,
    });
  },
  layers: [],
});

// Create and add the FlowmapLayer
function updateLayers() {
  deck.setProps({
    layers: [
      new FlowmapLayer({
        id: 'flowmap-layer',
        data,
        pickable: true,

        // Display settings
        darkMode: true,
        colorScheme: 'Teal',
        fadeAmount: 50,

        // Accessors
        getLocationId: (loc) => loc.id,
        getLocationLat: (loc) => loc.lat,
        getLocationLon: (loc) => loc.lon,
        getLocationName: (loc) => loc.name,
        getFlowOriginId: (flow) => flow.origin,
        getFlowDestId: (flow) => flow.dest,
        getFlowMagnitude: (flow) => flow.count,

        // Event handlers
        onHover: handleHover,
        onClick: handleClick,
      }),
    ],
  });
}

function handleHover(info) {
  if (info?.object) {
    console.log('Hovered:', info.object);
    // Update tooltip, etc.
  }
}

function handleClick(info) {
  if (info?.object) {
    console.log('Clicked:', info.object);
  }
}

// Initial render
updateLayers();
```

## Adding a Tooltip

```html
<style>
  .tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    pointer-events: none;
    font-family: sans-serif;
    font-size: 14px;
    display: none;
  }
</style>

<div id="tooltip" class="tooltip"></div>
```

```javascript
const tooltip = document.getElementById('tooltip');

function handleHover(info) {
  if (!info?.object) {
    tooltip.style.display = 'none';
    return;
  }

  tooltip.style.display = 'block';
  tooltip.style.left = `${info.x + 10}px`;
  tooltip.style.top = `${info.y + 10}px`;

  const {object} = info;
  if (object.type === 'location') {
    tooltip.innerHTML = `
      <strong>${object.name}</strong><br/>
      Incoming: ${object.totals.incomingCount.toLocaleString()}<br/>
      Outgoing: ${object.totals.outgoingCount.toLocaleString()}
    `;
  } else if (object.type === 'flow') {
    tooltip.innerHTML = `
      ${object.origin.name} → ${object.dest.name}<br/>
      ${object.count.toLocaleString()}
    `;
  }
}
```

## With UI Controls

Here's a more complete example with runtime configuration:

```javascript
import {Deck} from '@deck.gl/core';
import mapboxgl from 'mapbox-gl';
import {FlowmapLayer} from '@flowmap.gl/layers';
import {getViewStateForLocations} from '@flowmap.gl/data';

const MAPBOX_TOKEN = 'your-mapbox-token';

// Configuration state
const config = {
  darkMode: true,
  colorScheme: 'Teal',
  fadeAmount: 50,
  animationEnabled: false,
  clusteringEnabled: true,
  clusteringAuto: true,
};

let map;
let deck;
let data;

async function init() {
  // Load data
  data = await fetchData();

  // Calculate initial view
  const [width, height] = [window.innerWidth, window.innerHeight];
  const initialViewState = getViewStateForLocations(
    data.locations,
    (loc) => [loc.lon, loc.lat],
    [width, height],
    {pad: 0.3}
  );

  // Initialize map
  map = new mapboxgl.Map({
    container: 'map',
    accessToken: MAPBOX_TOKEN,
    style: 'mapbox://styles/mapbox/dark-v10',
    interactive: false,
    center: [initialViewState.longitude, initialViewState.latitude],
    zoom: initialViewState.zoom,
  });

  // Initialize deck.gl
  deck = new Deck({
    canvas: 'deck-canvas',
    width: '100%',
    height: '100%',
    initialViewState,
    controller: true,
    onViewStateChange: ({viewState}) => {
      map.jumpTo({
        center: [viewState.longitude, viewState.latitude],
        zoom: viewState.zoom,
        bearing: viewState.bearing,
        pitch: viewState.pitch,
      });
    },
    layers: [],
  });

  updateDeck();
  setupControls();
}

function updateDeck() {
  deck.setProps({
    layers: [
      new FlowmapLayer({
        id: 'flowmap-layer',
        data,
        pickable: true,
        darkMode: config.darkMode,
        colorScheme: config.colorScheme,
        fadeAmount: config.fadeAmount,
        animationEnabled: config.animationEnabled,
        clusteringEnabled: config.clusteringEnabled,
        clusteringAuto: config.clusteringAuto,
        getLocationId: (loc) => loc.id,
        getLocationLat: (loc) => loc.lat,
        getLocationLon: (loc) => loc.lon,
        getLocationName: (loc) => loc.name,
        getFlowOriginId: (flow) => flow.origin,
        getFlowDestId: (flow) => flow.dest,
        getFlowMagnitude: (flow) => flow.count,
      }),
    ],
  });
}

function setupControls() {
  // Dark mode toggle
  document.getElementById('darkMode').addEventListener('change', (e) => {
    config.darkMode = e.target.checked;
    map.setStyle(`mapbox://styles/mapbox/${config.darkMode ? 'dark' : 'light'}-v10`);
    updateDeck();
  });

  // Animation toggle
  document.getElementById('animation').addEventListener('change', (e) => {
    config.animationEnabled = e.target.checked;
    updateDeck();
  });

  // Clustering toggle
  document.getElementById('clustering').addEventListener('change', (e) => {
    config.clusteringEnabled = e.target.checked;
    updateDeck();
  });

  // Color scheme select
  document.getElementById('colorScheme').addEventListener('change', (e) => {
    config.colorScheme = e.target.value;
    updateDeck();
  });
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

// Start the application
init();
```

## Using with Vite

For modern development, use Vite:

```bash
npm create vite@latest my-flowmap-app -- --template vanilla
cd my-flowmap-app
npm install @flowmap.gl/layers @flowmap.gl/data @deck.gl/core mapbox-gl
```

Then update `main.js` with the code above.

## Using with Webpack

For Webpack projects, ensure you have the necessary loaders:

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
```

## Complete Example Repository

See the [vite-app example](https://github.com/visgl/flowmap.gl/tree/main/examples/vite-app) for a complete working setup.
