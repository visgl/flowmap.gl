import type {GlobeViewState, Layer} from '@deck.gl/core';
import {MapLibreOverlay, type MapLibreOverlayProps} from '@deck.gl/maplibre';
import type {StyleSpecification} from 'maplibre-gl';
import {useEffect, useMemo, useState} from 'react';
import {Map, NavigationControl, useControl} from 'react-map-gl/maplibre';
import {FLOWMAP_LABELS_ANCHOR, prepareBasemapStyle} from './basemap-style';

type GlobeMapProps = Pick<MapLibreOverlayProps, 'widgets'> & {
  layers: Layer[];
  darkMode: boolean;
  labelsEnabled: boolean;
  initialViewState: GlobeViewState;
  onMove: (event: {viewState: GlobeViewState}) => void;
};

export default function GlobeMap({
  darkMode,
  labelsEnabled,
  initialViewState,
  onMove,
  layers,
  widgets,
}: GlobeMapProps) {
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
  const orderedLayers = layers.map((layer) => {
    const props = {id: layer.id, beforeId: FLOWMAP_LABELS_ANCHOR};
    return layer.clone(props);
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
        projection="globe"
        initialViewState={initialViewState}
        onMove={onMove}
        mapStyle={mapStyle}
        style={{isolation: 'isolate'}}
        dragRotate={false}
        touchPitch={false}
        maxPitch={0}
        maxZoom={12}
      >
        <NavigationControl position="bottom-left" showCompass={false} />
        <FlowmapOverlay layers={orderedLayers} widgets={widgets} interleaved />
      </Map>
    </>
  );
}

function FlowmapOverlay(props: MapLibreOverlayProps) {
  const overlay = useControl(() => new MapLibreOverlay(props));
  overlay.setProps(props);
  return null;
}
