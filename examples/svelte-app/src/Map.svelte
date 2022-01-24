<script>
  import { onDestroy, setContext } from 'svelte';
  import { mapbox, key } from './mapbox.js';
  import {Deck} from "@deck.gl/core";
  import {fetchData} from "@flowmap.gl/examples-common";
  import {getViewStateForLocations} from "@flowmap.gl/data";
  import {FlowmapLayer} from "@flowmap.gl/layers";

  setContext(key, {
     getMap: () => map,
  });

  export let lat;
  export let lon;
  export let zoom;

  let mapboxContainer;
  let deckCanvas;
  let map;
  let deck;
  let flowmapData;

  fetchData()
    .then((data) => {
      flowmapData = data;

      map = new mapbox.Map({
        container: mapboxContainer,
        style: 'mapbox://styles/mapbox/dark-v10',
        center: [lon, lat],
        zoom,
      });

      deck = new Deck({
        canvas: deckCanvas,
        width: '100%',
        height: '100%',
        initialViewState: getViewStateForLocations(
          data.locations,
          (loc) => [loc.lon, loc.lat],
          [globalThis.innerWidth, globalThis.innerHeight],
          {pad: 0.3},
        ),
        controller: true,
        map: true,
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

  onDestroy(() => {
    if (map) map.remove();
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
          // animationEnabled: config.animationEnabled,
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

<svelte:head>
  <link
      rel="stylesheet"
      href="https://unpkg.com/mapbox-gl/dist/mapbox-gl.css"
  />
</svelte:head>

<div class="container">
  <div bind:this={mapboxContainer} id="mapbox-container">
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
  #mapbox-container {
    opacity: 0.5;
  }
  #deck-canvas {
    mix-blend-mode: screen;
  }
</style>
