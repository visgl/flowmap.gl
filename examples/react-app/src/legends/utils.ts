export type Rgba = [number, number, number, number];

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
