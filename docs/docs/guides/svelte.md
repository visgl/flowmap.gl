---
sidebar_position: 3
---

# Svelte Integration

This guide shows how to integrate flowmap.gl with Svelte applications.

## Prerequisites

Install the required dependencies:

```bash
npm install @flowmap.gl/layers @flowmap.gl/data @deck.gl/core mapbox-gl
```

## Basic Component

Create a `Map.svelte` component:

```svelte
<script>
  import {onDestroy, onMount} from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import {Deck} from '@deck.gl/core';
  import {FlowmapLayer} from '@flowmap.gl/layers';
  import {getViewStateForLocations} from '@flowmap.gl/data';

  export let data;
  export let darkMode = true;
  export let colorScheme = 'Teal';

  let mapContainer;
  let deckCanvas;
  let map;
  let deck;

  const MAPBOX_TOKEN = 'your-mapbox-token';

  onMount(() => {
    if (!data) return;

    // Calculate initial view state
    const [width, height] = [window.innerWidth, window.innerHeight];
    const initialViewState = getViewStateForLocations(
      data.locations,
      (loc) => [loc.lon, loc.lat],
      [width, height],
      {pad: 0.3}
    );

    // Initialize Mapbox
    map = new mapboxgl.Map({
      container: mapContainer,
      accessToken: MAPBOX_TOKEN,
      style: `mapbox://styles/mapbox/${darkMode ? 'dark' : 'light'}-v10`,
      interactive: false,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
    });

    // Initialize deck.gl
    deck = new Deck({
      canvas: deckCanvas,
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

    updateLayers();
  });

  onDestroy(() => {
    if (deck) deck.finalize();
    if (map) map.remove();
  });

  function updateLayers() {
    if (!deck || !data) return;

    deck.setProps({
      layers: [
        new FlowmapLayer({
          id: 'flowmap-layer',
          data,
          pickable: true,
          darkMode,
          colorScheme,
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

  // Re-render when props change
  $: if (deck && data) {
    updateLayers();
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
  />
</svelte:head>

<div class="container">
  <div bind:this={mapContainer} class="map"></div>
  <canvas bind:this={deckCanvas} class="deck"></canvas>
</div>

<style>
  .container {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .map, .deck {
    position: absolute;
    width: 100%;
    height: 100%;
  }
  .map {
    opacity: 0.5;
  }
  .deck {
    mix-blend-mode: screen;
  }
</style>
```

## Using the Component

In your `App.svelte`:

```svelte
<script>
  import {onMount} from 'svelte';
  import Map from './Map.svelte';

  let data = null;

  onMount(async () => {
    // Load your data
    data = await fetchData();
  });

  async function fetchData() {
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
</script>

{#if data}
  <Map {data} darkMode={true} colorScheme="Teal" />
{:else}
  <p>Loading...</p>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    width: 100vw;
    height: 100vh;
  }
</style>
```

## Adding Tooltips

Extend the component to support tooltips:

```svelte
<script>
  import {onDestroy, onMount} from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import {Deck} from '@deck.gl/core';
  import {FlowmapLayer} from '@flowmap.gl/layers';
  import {getViewStateForLocations} from '@flowmap.gl/data';

  export let data;
  export let darkMode = true;
  export let colorScheme = 'Teal';

  let mapContainer;
  let deckCanvas;
  let map;
  let deck;
  let tooltip = null;

  const MAPBOX_TOKEN = 'your-mapbox-token';

  onMount(() => {
    if (!data) return;

    const [width, height] = [window.innerWidth, window.innerHeight];
    const initialViewState = getViewStateForLocations(
      data.locations,
      (loc) => [loc.lon, loc.lat],
      [width, height],
      {pad: 0.3}
    );

    map = new mapboxgl.Map({
      container: mapContainer,
      accessToken: MAPBOX_TOKEN,
      style: `mapbox://styles/mapbox/${darkMode ? 'dark' : 'light'}-v10`,
      interactive: false,
      center: [initialViewState.longitude, initialViewState.latitude],
      zoom: initialViewState.zoom,
    });

    deck = new Deck({
      canvas: deckCanvas,
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
        tooltip = null;  // Hide tooltip on view change
      },
      layers: [],
    });

    updateLayers();
  });

  onDestroy(() => {
    if (deck) deck.finalize();
    if (map) map.remove();
  });

  function handleHover(info) {
    if (!info?.object) {
      tooltip = null;
      return;
    }

    tooltip = {
      x: info.x,
      y: info.y,
      object: info.object,
    };
  }

  function updateLayers() {
    if (!deck || !data) return;

    deck.setProps({
      layers: [
        new FlowmapLayer({
          id: 'flowmap-layer',
          data,
          pickable: true,
          darkMode,
          colorScheme,
          getLocationId: (loc) => loc.id,
          getLocationLat: (loc) => loc.lat,
          getLocationLon: (loc) => loc.lon,
          getLocationName: (loc) => loc.name,
          getFlowOriginId: (flow) => flow.origin,
          getFlowDestId: (flow) => flow.dest,
          getFlowMagnitude: (flow) => flow.count,
          onHover: handleHover,
        }),
      ],
    });
  }

  $: if (deck && data) {
    updateLayers();
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
  />
</svelte:head>

<div class="container">
  <div bind:this={mapContainer} class="map"></div>
  <canvas bind:this={deckCanvas} class="deck"></canvas>

  {#if tooltip}
    <div
      class="tooltip"
      style="left: {tooltip.x + 10}px; top: {tooltip.y + 10}px"
    >
      {#if tooltip.object.type === 'location'}
        <strong>{tooltip.object.name}</strong>
        <div>In: {tooltip.object.totals.incomingCount.toLocaleString()}</div>
        <div>Out: {tooltip.object.totals.outgoingCount.toLocaleString()}</div>
      {:else if tooltip.object.type === 'flow'}
        <div>{tooltip.object.origin.name} → {tooltip.object.dest.name}</div>
        <div>{tooltip.object.count.toLocaleString()}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    position: relative;
    width: 100%;
    height: 100%;
  }
  .map, .deck {
    position: absolute;
    width: 100%;
    height: 100%;
  }
  .map {
    opacity: 0.5;
  }
  .deck {
    mix-blend-mode: screen;
  }
  .tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    pointer-events: none;
    font-size: 14px;
  }
</style>
```

## With Reactive Controls

Add reactive controls using Svelte's built-in reactivity:

```svelte
<script>
  import Map from './Map.svelte';
  import {onMount} from 'svelte';

  let data = null;
  let darkMode = true;
  let colorScheme = 'Teal';
  let animationEnabled = false;
  let clusteringEnabled = true;

  onMount(async () => {
    data = await fetchData();
  });

  async function fetchData() {
    // Your data loading logic
  }
</script>

<div class="app">
  <div class="controls">
    <label>
      <input type="checkbox" bind:checked={darkMode} />
      Dark Mode
    </label>
    <label>
      <input type="checkbox" bind:checked={animationEnabled} />
      Animation
    </label>
    <label>
      <input type="checkbox" bind:checked={clusteringEnabled} />
      Clustering
    </label>
    <label>
      Color Scheme:
      <select bind:value={colorScheme}>
        <option value="Teal">Teal</option>
        <option value="Blues">Blues</option>
        <option value="Greens">Greens</option>
        <option value="Oranges">Oranges</option>
      </select>
    </label>
  </div>

  {#if data}
    <Map
      {data}
      {darkMode}
      {colorScheme}
      {animationEnabled}
      {clusteringEnabled}
    />
  {/if}
</div>

<style>
  .app {
    width: 100vw;
    height: 100vh;
    position: relative;
  }
  .controls {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1;
    background: rgba(0, 0, 0, 0.8);
    padding: 10px;
    border-radius: 4px;
    color: white;
  }
  .controls label {
    display: block;
    margin-bottom: 8px;
  }
</style>
```

## Complete Example Repository

See the [svelte-app example](https://github.com/visgl/flowmap.gl/tree/main/examples/svelte-app) for a complete working setup.

## SvelteKit

For SvelteKit applications, ensure the component only renders on the client side:

```svelte
<script>
  import {browser} from '$app/environment';
  import {onMount} from 'svelte';

  let Map;
  let data = null;

  onMount(async () => {
    // Dynamically import to avoid SSR issues
    Map = (await import('./Map.svelte')).default;
    data = await fetchData();
  });
</script>

{#if browser && Map && data}
  <svelte:component this={Map} {data} />
{/if}
```
