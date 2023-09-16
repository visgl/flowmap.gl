/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import {ReactNode, useEffect, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {
  FlowmapLayer,
  FlowmapLayerPickingInfo,
  PickingType,
} from '@flowmap.gl/layers';
import {ViewState} from '@flowmap.gl/data';
import {
  FlowDatum,
  LocationDatum,
  createWorkerDataProvider,
  WorkerFlowmapDataProvider,
} from './worker';
import {Map as ReactMapGl} from 'react-map-gl';
import {initLilGui, UI_INITIAL, useUI} from '@flowmap.gl/examples-common';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/streets-v11';
const MAPBOX_STYLE_DARK = MAPBOX_STYLE_LIGHT;

type TooltipState = {
  position: {left: number; top: number};
  content: ReactNode;
};

const DATA_BASE_URL = 'https://gist.githubusercontent.com/ilyabo/';
const DATA_PATH = `${DATA_BASE_URL}/68d3dba61d86164b940ffe60e9d36931/raw/a72938b5d51b6df9fa7bba9aa1fb7df00cd0f06a`;

async function createDataProvider() {
  return await createWorkerDataProvider({
    flows: {
      url: `${DATA_PATH}/flows.csv`,
      columns: {
        originId: 'origin',
        destId: 'dest',
        count: 'count',
      },
    },
    locations: {
      url: `${DATA_PATH}/locations.csv`,
      columns: {
        id: 'id',
        name: 'name',
        lat: 'lat',
        lon: 'lon',
      },
    },
  });
}

function App() {
  const config = useUI(UI_INITIAL, initLilGui);
  const [viewState, setViewState] = useState<ViewState>();
  const [data, setData] = useState<{dataProvider: WorkerFlowmapDataProvider}>();
  const [tooltip, setTooltip] = useState<TooltipState>();
  useEffect(() => {
    (async () => {
      const dataProvider = await createDataProvider();
      setData({dataProvider});
      const [width, height] = [globalThis.innerWidth, globalThis.innerHeight];
      const viewState = await dataProvider.getViewportForLocations([
        width,
        height,
      ]);
      if (viewState) {
        // @ts-ignore
        setViewState(viewState);
      }
    })();
  }, []);
  const handleViewStateChange = ({viewState}: any) => {
    setViewState(viewState);
    setTooltip(undefined);
  };
  const layers = [];
  if (data) {
    layers.push(
      new FlowmapLayer<LocationDatum, FlowDatum>({
        id: 'my-flowmap-layer',
        dataProvider: data.dataProvider,
        opacity: config.opacity,
        pickable: true,
        darkMode: config.darkMode,
        colorScheme: config.colorScheme,
        fadeAmount: config.fadeAmount,
        fadeEnabled: config.fadeEnabled,
        fadeOpacityEnabled: config.fadeOpacityEnabled,
        locationsEnabled: config.locationsEnabled,
        locationTotalsEnabled: config.locationTotalsEnabled,
        animationEnabled: config.animationEnabled,
        clusteringEnabled: config.clusteringEnabled,
        clusteringAuto: config.clusteringAuto,
        clusteringLevel: config.clusteringLevel,
        adaptiveScalesEnabled: config.adaptiveScalesEnabled,
        highlightColor: config.highlightColor,
        maxTopFlowsDisplayNum: config.maxTopFlowsDisplayNum,
        onHover: (info) => setTooltip(getTooltipState(info)),
        onClick: (info) =>
          console.log('clicked', info.object?.type, info.object),
      }),
    );
  }
  if (!viewState) {
    return null;
  }
  return (
    <div
      className={`flowmap-container ${config.darkMode ? 'dark' : 'light'}`}
      style={{position: 'relative'}}
    >
      <DeckGL
        width="100%"
        height="100%"
        // viewState={viewState}
        initialViewState={viewState}
        onViewStateChange={handleViewStateChange}
        controller={true}
        layers={layers}
        style={{mixBlendMode: config.darkMode ? 'screen' : 'darken'}}
      >
        <ReactMapGl
          mapboxAccessToken={MAPBOX_ACCESS_TOKEN}
          mapStyle={config.darkMode ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_LIGHT}
        />
      </DeckGL>
      {tooltip && (
        <div className="tooltip" style={tooltip.position}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

function getTooltipState(
  info: FlowmapLayerPickingInfo<LocationDatum, FlowDatum> | undefined,
): TooltipState | undefined {
  if (!info) return undefined;
  const {x, y, object} = info;
  const position = {left: x, top: y};
  switch (object?.type) {
    case PickingType.LOCATION:
      return {
        position,
        content: (
          <>
            <div>{object.name}</div>
            <div>Incoming trips: {object.totals.incomingCount}</div>
            <div>Outgoing trips: {object.totals.outgoingCount}</div>
            <div>Internal or round trips: {object.totals.internalCount}</div>
          </>
        ),
      };
    case PickingType.FLOW:
      return {
        position,
        content: (
          <>
            <div>{`${object.origin.id} → ${object.dest.id}`}</div>
            <div>{object.count}</div>
          </>
        ),
      };
  }
  return undefined;
}

export default App;
