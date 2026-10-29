import type {ViewportProps} from './types';

export type GlobePoint = [number, number, number];
const RADIUS = 256;

/** Unit sphere in deck.gl's globe coordinate system. */
export function projectGlobeLocation(
  longitude: number,
  latitude: number,
): GlobePoint {
  const lambda = (longitude * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  return [
    Math.sin(lambda) * Math.cos(phi),
    -Math.cos(lambda) * Math.cos(phi),
    Math.sin(phi),
  ];
}

const dot = (a: readonly number[], b: readonly number[]) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Cache the horizon and padded screen planes once per viewport update. */
export function getGlobeVisibility(viewport: ViewportProps, padding: number) {
  const {cameraPosition: camera, viewProjectionMatrix: m} = viewport.globe!;
  const xLimit = 1 + (2 * padding) / viewport.width;
  const yLimit = 1 + (2 * padding) / viewport.height;
  const row = (i: number) => [
    m[i] * RADIUS,
    m[i + 4] * RADIUS,
    m[i + 8] * RADIUS,
    m[i + 12],
  ];
  const w = row(3);
  const planes = [[...camera, -RADIUS], w];
  for (const [i, limit] of [
    [0, xLimit],
    [1, yLimit],
  ]) {
    const r = row(i);
    for (const sign of [-1, 1])
      planes.push(w.map((value, j) => limit * value + sign * r[j]));
  }
  return {
    point: (p: GlobePoint) =>
      planes.every((plane) => dot(plane, p) + plane[3] >= 0),
    /** Conservative arc/frustum test: reject only if the entire great-circle
     * arc is outside one plane. The shader clips any remaining excess. */
    arc: (start: GlobePoint, end: GlobePoint) => {
      const cosine = Math.max(-1, Math.min(1, dot(start, end)));
      const tangent = end.map((value, i) => value - start[i] * cosine);
      const length = Math.hypot(...tangent);
      const angle = Math.atan2(length, cosine);
      if (length < 1e-6) {
        // Match the shader's deterministic plane for antipodal endpoints.
        tangent.splice(
          0,
          3,
          ...(Math.abs(start[2]) < 0.9
            ? [-start[1], start[0], 0]
            : [0, -start[2], start[1]]),
        );
      }
      const norm = Math.hypot(...tangent);
      const direction = tangent.map((value) => value / norm);
      return planes.every((plane) => {
        const a = dot(plane, start);
        const b = dot(plane, direction);
        let maximum = Math.max(a, a * Math.cos(angle) + b * Math.sin(angle));
        const peak = (Math.atan2(b, a) + 2 * Math.PI) % (2 * Math.PI);
        if (peak <= angle) maximum = Math.max(maximum, Math.hypot(a, b));
        return maximum + plane[3] >= -1e-8;
      });
    },
  };
}

/** Test a surface location against the globe horizon and the padded screen. */
export function isLocationVisibleOnGlobe(
  longitude: number,
  latitude: number,
  viewport: ViewportProps,
  padding: number,
): boolean {
  return getGlobeVisibility(viewport, padding).point(
    projectGlobeLocation(longitude, latitude),
  );
}
