<script>
  import {onMount, setContext} from 'svelte';
  import {maplibregl, key} from './map-provider.js';
  import {Deck} from '@deck.gl/core';
  import {fetchData} from '@flowmap.gl/examples-common';
  import {getViewStateForLocations} from '@flowmap.gl/data';
  import {FlowmapLayer} from '@flowmap.gl/layers';
  import 'maplibre-gl/dist/maplibre-gl.css';

  setContext(key, {
    getMap: () => map,
  });

  let mapContainer;
  let deckCanvas;
  let map;
  let deck;
  let flowmapData;

  const MAP_STYLE_DARK =
    'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

  onMount(() => {
    let cancelled = false;
    fetchData().then((data) => {
      if (cancelled) return;
      flowmapData = data;
      const initialViewState = getViewStateForLocations(
        data.locations,
        (loc) => [loc.lon, loc.lat],
        [globalThis.innerWidth, globalThis.innerHeight],
        {pad: 0.3},
      );

      map = new maplibregl.Map({
        container: mapContainer,
        style: MAP_STYLE_DARK,
        center: [initialViewState.longitude, initialViewState.latitude],
        zoom: initialViewState.zoom,
        interactive: false,
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
        },
        layers: [],
      });
      updateDeck();
    });

    return () => {
      cancelled = true;
      deck?.finalize();
      map?.remove();
    };
  });

  function updateDeck() {
    deck.setProps({
      layers: [
        new FlowmapLayer({
          id: 'my-flowmap-layer',
          data: flowmapData,
          pickable: true,
          // TODO: add svelte-knobby
          // opacity: config.opacity,
          // darkMode: config.darkMode,
          // colorScheme: config.colorScheme,
          // fadeAmount: config.fadeAmount,
          // fadeEnabled: config.fadeEnabled,
          // fadeOpacityEnabled: config.fadeOpacityEnabled,
          // locationTotalsEnabled: config.locationTotalsEnabled,
          // flowLinesRenderingMode: config.flowLinesRenderingMode,
          // clusteringEnabled: config.clusteringEnabled,
          // clusteringAuto: config.clusteringAuto,
          // clusteringLevel: config.clusteringLevel,
          // adaptiveScalesEnabled: config.adaptiveScalesEnabled,
          // highlightColor: config.highlightColor,
          getLocationId: (loc) => loc.id,
          getLocationLat: (loc) => loc.lat,
          getLocationLon: (loc) => loc.lon,
          getFlowOriginId: (flow) => flow.origin,
          getFlowDestId: (flow) => flow.dest,
          getFlowMagnitude: (flow) => flow.count,
          getLocationName: (loc) => loc.name,
          // onHover: (info) => setTooltip(getTooltipState(info)),
          // onClick: (info) => console.log('clicked', info.type, info.object),
        }),
      ],
    });
  }
</script>

<div class="container">
  <div bind:this={mapContainer} id="map-container">
    {#if map}
      <slot />
    {/if}
  </div>
  <canvas bind:this={deckCanvas} id="deck-canvas"></canvas>
</div>

<style>
  div.container {
    width: 100%;
    height: 100%;
  }
  div.container > * {
    position: absolute;
    width: 100%;
    height: 100%;
  }
  #map-container {
    opacity: 0.5;
  }
  #deck-canvas {
    mix-blend-mode: screen;
  }
</style>
