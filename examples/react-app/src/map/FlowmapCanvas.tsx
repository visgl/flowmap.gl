import {
  _GlobeView as GlobeView,
  MapView,
  type GlobeViewState,
  type MapViewState,
  type Layer,
} from '@deck.gl/core';
import {
  getFlowmapCanvasStyle,
  getFlowmapCanvasClearColor,
  type BlendingMode,
} from '@flowmap.gl/layers';
import {MapLibreOverlay, type MapLibreOverlayProps} from '@deck.gl/maplibre';
import type {StyleSpecification} from 'maplibre-gl';
import {useEffect, useMemo, useState} from 'react';
import {Map, NavigationControl, useControl} from 'react-map-gl/maplibre';
import {prepareBasemapStyle} from './basemap-style';

type FlowmapCanvasProps = Pick<MapLibreOverlayProps, 'widgets'> & {
  layers: Layer[];
  projection: 'globe' | 'mercator';
  interleaved: boolean;
  blendingMode: BlendingMode;
  darkMode: boolean;
  labelsEnabled: boolean;
  initialViewState: GlobeViewState | MapViewState;
  onMove: (event: {viewState: MapViewState}) => void;
};

export default function FlowmapCanvas({
  projection,
  darkMode,
  interleaved,
  blendingMode,
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
  const clearColor = interleaved
    ? undefined
    : getFlowmapCanvasClearColor({blendingMode, darkMode});
  const View = globe ? GlobeView : MapView;
  const views = new View({
    id: 'maplibre',
    clear: Boolean(clearColor),
    clearColor,
  });
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
        projection={globe ? 'globe' : 'mercator'}
        initialViewState={initialViewState}
        longitude={initialViewState.longitude}
        latitude={initialViewState.latitude}
        zoom={initialViewState.zoom}
        onMove={onMove}
        mapStyle={mapStyle}
        style={{isolation: interleaved ? 'isolate' : undefined}}
        dragRotate={!globe}
        touchPitch={!globe}
        maxPitch={globe ? 0 : 60}
        maxZoom={globe ? 12 : 20}
      >
        <NavigationControl position="bottom-left" showCompass={!globe} />
        <FlowmapOverlay
          key={String(interleaved)}
          layers={layers}
          widgets={widgets}
          interleaved={interleaved}
          parameters={{depthWriteEnabled: false, depthCompare: 'always'}}
          // MapLibreOverlay's DeckProps default incorrectly narrows views to null.
          views={views as unknown as MapLibreOverlayProps['views']}
          style={
            interleaved
              ? undefined
              : getFlowmapCanvasStyle({blendingMode, darkMode})
          }
        />
      </Map>
    </>
  );
}

function FlowmapOverlay(props: MapLibreOverlayProps) {
  const overlay = useControl(() => new MapLibreOverlay(props));
  overlay.setProps(props);
  useEffect(() => {
    // Deck's imperative style prop is only applied at canvas creation.
    // Theme/mode changes must also update the existing separate canvas.
    if (!props.interleaved) {
      const canvas = overlay.getCanvas();
      if (canvas) Object.assign(canvas.style, props.style);
    }
  }, [overlay, props.interleaved, props.style]);
  return null;
}
