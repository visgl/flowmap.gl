import type {GlobeViewState, MapViewState, Layer} from '@deck.gl/core';
import {MapLibreOverlay, type MapLibreOverlayProps} from '@deck.gl/maplibre';
import type {StyleSpecification} from 'maplibre-gl';
import {useEffect, useMemo, useState} from 'react';
import {Map, NavigationControl, useControl} from 'react-map-gl/maplibre';
import {prepareBasemapStyle} from './basemap-style';

type FlowmapCanvasProps = Pick<MapLibreOverlayProps, 'widgets'> & {
  layers: Layer[];
  projection: 'globe' | 'mercator';
  darkMode: boolean;
  labelsEnabled: boolean;
  initialViewState: GlobeViewState | MapViewState;
  onMove: (event: {viewState: MapViewState}) => void;
};

export default function FlowmapCanvas({
  projection,
  darkMode,
  labelsEnabled,
  initialViewState,
  onMove,
  layers,
  widgets,
}: FlowmapCanvasProps) {
  const globe = projection === 'globe';
  const [sourceStyle, setSourceStyle] = useState<StyleSpecification>();
  const [styleError, setStyleError] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    setStyleError(undefined);
    fetch(
      `https://tiles.openfreemap.org/styles/${darkMode ? 'dark' : 'positron'}`,
      {
        signal: controller.signal,
      },
    )
      .then((response) => {
        if (!response.ok)
          throw new Error(`Basemap request failed (${response.status})`);
        return response.json();
      })
      .then((style: StyleSpecification) => {
        if (!controller.signal.aborted) setSourceStyle(style);
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setStyleError(error.message);
      });
    return () => controller.abort();
  }, [darkMode]);
  const mapStyle = useMemo(
    () => sourceStyle && prepareBasemapStyle(sourceStyle, labelsEnabled),
    [sourceStyle, labelsEnabled],
  );
  if (!mapStyle) {
    return (
      <div className="basemap-status" role={styleError ? 'alert' : 'status'}>
        {styleError ?? 'Loading basemap…'}
      </div>
    );
  }
  return (
    <>
      {styleError && (
        <div className="basemap-status" role="alert">
          {styleError}
        </div>
      )}
      <Map
        projection={projection}
        initialViewState={initialViewState}
        onMove={onMove}
        mapStyle={mapStyle}
        style={{isolation: 'isolate'}}
        dragRotate={!globe}
        touchPitch={!globe}
        maxPitch={globe ? 0 : 60}
        maxZoom={globe ? 12 : 20}
      >
        <NavigationControl position="bottom-left" showCompass={!globe} />
        <FlowmapOverlay
          layers={layers}
          widgets={widgets}
          interleaved
          // These are 2D overlays: don't occlude basemap labels drawn afterward.
          parameters={{depthWriteEnabled: false, depthCompare: 'always'}}
        />
      </Map>
    </>
  );
}

function FlowmapOverlay(props: MapLibreOverlayProps) {
  const overlay = useControl(() => new MapLibreOverlay(props));
  overlay.setProps(props);
  return null;
}
