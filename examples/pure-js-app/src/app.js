import {Deck} from '@deck.gl/core';
import {ScatterplotLayer} from '@deck.gl/layers';
import mapboxgl from 'mapbox-gl';
import {FlowMapLayer} from '@flowmap.gl/layers';
import {GUI} from 'lil-gui';
import {fetchData, initLilGui, UI_INITIAL} from '@flowmap.gl/examples-common';
import {getViewStateForLocations} from '@flowmap.gl/data';

// eslint-disable-next-line no-undef
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v10';
const config = {...UI_INITIAL};

fetchData().then((data) => {
  const gui = new GUI();
  initLilGui(gui);

  const {locations, flows} = data;
  // eslint-disable-next-line no-undef
  const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
  const INITIAL_VIEW_STATE = getViewStateForLocations(
    locations,
    (loc) => [loc.lon, loc.lat],
    [width, height],
    {pad: 0.3},
  );
  //
  // const INITIAL_VIEW_STATE = {
  //   latitude: 51.47,
  //   longitude: 0.45,
  //   zoom: 4,
  //   bearing: 0,
  //   pitch: 30,
  // };

  const map = new mapboxgl.Map({
    container: 'map',
    accessToken: MAPBOX_ACCESS_TOKEN,
    style: MAPBOX_STYLE_DARK,
    // Note: deck.gl will be in charge of interaction and event handling
    interactive: false,
    center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
    zoom: INITIAL_VIEW_STATE.zoom,
    bearing: INITIAL_VIEW_STATE.bearing,
    pitch: INITIAL_VIEW_STATE.pitch,
  });

  new Deck({
    canvas: 'deck-canvas',
    width: '100%',
    height: '100%',
    initialViewState: INITIAL_VIEW_STATE,
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
    layers: [
      // new ScatterplotLayer({
      //   id: 'scatterplot-layer',
      //   data: [
      //     {
      //       name: 'Colma (COLM)',
      //       code: 'CM',
      //       address: '365 D Street, Colma CA 94014',
      //       exits: 4214,
      //       coordinates: [-122.466233, 37.684638],
      //     },
      //   ],
      //   pickable: true,
      //   opacity: 0.8,
      //   stroked: true,
      //   filled: true,
      //   radiusScale: 6,
      //   radiusMinPixels: 1,
      //   radiusMaxPixels: 100,
      //   lineWidthMinPixels: 1,
      //   getPosition: (d) => d.coordinates,
      //   getRadius: (d) => Math.sqrt(d.exits),
      //   getFillColor: (d) => [255, 140, 0],
      //   getLineColor: (d) => [0, 0, 0],
      // }),
      new FlowMapLayer({
        id: 'my-flowmap-layer',
        data,
        pickable: false,
        darkMode: config.darkMode,
        colorScheme: config.colorScheme,
        fadeAmount: config.fadeAmount,
        fadeEnabled: config.fadeEnabled,
        fadeOpacityEnabled: config.fadeOpacityEnabled,
        locationTotalsEnabled: config.locationTotalsEnabled,
        animationEnabled: config.animationEnabled,
        clusteringEnabled: config.clusteringEnabled,
        clusteringAuto: config.clusteringAuto,
        clusteringLevel: config.clusteringLevel,
        adaptiveScalesEnabled: config.adaptiveScalesEnabled,
        highlightColor: config.highlightColor,
        getLocationId: (loc) => loc.id,
        getLocationCentroid: (loc) => [loc.lon, loc.lat],
        getFlowOriginId: (flow) => flow.origin,
        getFlowDestId: (flow) => flow.dest,
        getFlowMagnitude: (flow) => flow.count,
        getLocationName: (loc) => loc.name,
        // onHover: (info) => setTooltip(getTooltipState(info)),
        // onClick: (info) => console.log('clicked', info.type, info.object),
      }),
    ],
  });

  gui.onChange(console.log);
});
