import type {ScaleState} from '@flowmap.gl/data';
import type {ScaleLegendModel} from './types';

export type Rgba = [number, number, number, number];

export function makeScaleLegendModel(
  scaleState: ScaleState | undefined,
): ScaleLegendModel | undefined {
  if (
    !scaleState ||
    (!scaleState.flowThickness && !scaleState.locationCircles)
  ) {
    return undefined;
  }
  const flowThickness = scaleState.flowThickness
    ? {
        domain: scaleState.flowThickness.domain,
        thicknessRange: scaleState.flowThickness.thicknessRange,
        samples: scaleState.flowThickness.samples.map((sample) => ({
          ...sample,
          label: formatLegendValue(sample.magnitude),
        })),
        ...(scaleState.flowThickness.outOfScale
          ? {
              outOfScale: {
                color: scaleState.flowThickness.outOfScale.color,
                thickness: scaleState.flowThickness.outOfScale.thickness,
                label: 'Outside locked scale',
                magnitudeLabel: `> ${formatLegendValue(
                  scaleState.flowThickness.outOfScale.magnitude,
                )}`,
              },
            }
          : {}),
      }
    : undefined;
  const locationCircles = scaleState.locationCircles
    ? {
        domain: scaleState.locationCircles.domain,
        radiusRange: scaleState.locationCircles.radiusRange,
        incomingLabel: 'Incoming + internal',
        outgoingLabel: 'Outgoing + internal',
        colors: scaleState.locationCircles.colors,
        ...(scaleState.locationCircles.outOfScale
          ? {
              outOfScale: {
                color: scaleState.locationCircles.outOfScale.color,
                radius: scaleState.locationCircles.outOfScale.radius,
                label: 'Outside locked scale',
                magnitudeLabel: `> ${formatLegendValue(
                  scaleState.locationCircles.outOfScale.magnitude,
                )}`,
              },
            }
          : {}),
      }
    : undefined;
  return {
    locked: scaleState.locked,
    ...(flowThickness ? {flowThickness} : {}),
    ...(locationCircles ? {locationCircles} : {}),
  };
}

export function formatLegendRange([min, max]: [number, number]): string {
  return `${formatLegendValue(min)} - ${formatLegendValue(max)}`;
}

export function rgbaToCss([r, g, b, a]: Rgba): string {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

export function mixRgba(from: Rgba, to: Rgba, amount: number): Rgba {
  return [
    Math.round(from[0] * (1 - amount) + to[0] * amount),
    Math.round(from[1] * (1 - amount) + to[1] * amount),
    Math.round(from[2] * (1 - amount) + to[2] * amount),
    Math.round(from[3] * (1 - amount) + to[3] * amount),
  ];
}

function formatLegendValue(value: number): string {
  return value >= 1000
    ? value.toLocaleString(undefined, {maximumFractionDigits: 0})
    : value.toLocaleString(undefined, {maximumFractionDigits: 2});
}
