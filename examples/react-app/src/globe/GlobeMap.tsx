import type {GlobeViewState} from '@deck.gl/core';
import {MapLibreOverlay, type MapLibreOverlayProps} from '@deck.gl/maplibre';
import {Map, NavigationControl, useControl} from 'react-map-gl/maplibre';

type GlobeMapProps = Pick<MapLibreOverlayProps, 'layers' | 'widgets'> & {
  darkMode: boolean;
  initialViewState: GlobeViewState;
  onMove: (event: {viewState: GlobeViewState}) => void;
};

export default function GlobeMap({
  darkMode,
  initialViewState,
  onMove,
  layers,
  widgets,
}: GlobeMapProps) {
  return (
    <Map
      projection="globe"
      initialViewState={initialViewState}
      onMove={onMove}
      mapStyle={`https://tiles.openfreemap.org/styles/${darkMode ? 'dark' : 'positron'}`}
      style={{isolation: 'isolate'}}
      dragRotate={false}
      touchPitch={false}
      maxPitch={0}
      maxZoom={12}
    >
      <NavigationControl position="bottom-left" showCompass={false} />
      <FlowmapOverlay layers={layers} widgets={widgets} interleaved />
    </Map>
  );
}

function FlowmapOverlay(props: MapLibreOverlayProps) {
  const overlay = useControl(() => new MapLibreOverlay(props));
  overlay.setProps(props);
  return null;
}
