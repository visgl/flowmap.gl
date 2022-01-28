import {WebMercatorViewport} from '@math.gl/web-mercator';
import {ViewportProps} from './types';
import {scaleLinear} from 'd3-scale';

// TODO: use re-reselect

export const getViewportBoundingBox = (
  viewport: ViewportProps,
  maxLocationCircleSize = 0,
): [number, number, number, number] => {
  const pad = maxLocationCircleSize;
  const bounds = new WebMercatorViewport({
    ...viewport,
    width: viewport.width + pad * 2,
    height: viewport.height + pad * 2,
  }).getBounds();
  return [bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]];
};

export const getFlowThicknessScale = (
  magnitudeExtent: [number, number] | undefined,
) => {
  if (!magnitudeExtent) return undefined;
  return scaleLinear()
    .range([0.025, 0.5])
    .domain([
      0,
      // should support diff mode too
      Math.max.apply(
        null,
        magnitudeExtent.map((x: number | undefined) => Math.abs(x || 0)),
      ),
    ]);
};
