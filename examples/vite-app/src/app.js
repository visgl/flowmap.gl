/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Deck} from '@deck.gl/core';
import maplibregl from 'maplibre-gl';
import {FlowmapLayer} from '@flowmap.gl/layers';
import {GUI} from 'lil-gui';
import {fetchData, initLilGui, UI_INITIAL} from '@flowmap.gl/examples-common';
import {getViewStateForLocations} from '@flowmap.gl/data';
import 'maplibre-gl/dist/maplibre-gl.css';

const MAP_STYLE_DARK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const config = {...UI_INITIAL};

fetchData().then((data) => {
  const gui = new GUI();
  initLilGui(gui);

  const {locations, flows} = data;

  const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
  const INITIAL_VIEW_STATE = getViewStateForLocations(
    locations,
    (loc) => [loc.lon, loc.lat],
    [width, height],
    {pad: 0.3},
  );

  const map = new maplibregl.Map({
    container: 'map',
    style: MAP_STYLE_DARK,
    interactive: false,
    center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
    zoom: INITIAL_VIEW_STATE.zoom,
    bearing: INITIAL_VIEW_STATE.bearing,
    pitch: INITIAL_VIEW_STATE.pitch,
  });

  const deck = new Deck({
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
    layers: [],
  });

  updateDeck();
  gui.onChange(({property, value}) => {
    config[property] = value;
    updateDeck();
  });

  function updateDeck() {
    deck.setProps({
      layers: [
        new FlowmapLayer({
          id: 'my-flowmap-layer',
          data,
          pickable: true,
          opacity: config.opacity,
          darkMode: config.darkMode,
          colorScheme: config.colorScheme,
          fadeAmount: config.fadeAmount,
          fadeEnabled: config.fadeEnabled,
          fadeOpacityEnabled: config.fadeOpacityEnabled,
          locationsEnabled: config.locationsEnabled,
          locationTotalsEnabled: config.locationTotalsEnabled,
          flowLinesRenderingMode: config.flowLinesRenderingMode,
          clusteringEnabled: config.clusteringEnabled,
          clusteringAuto: config.clusteringAuto,
          clusteringLevel: config.clusteringLevel,
          adaptiveScalesEnabled: config.adaptiveScalesEnabled,
          highlightColor: config.highlightColor,
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
});
