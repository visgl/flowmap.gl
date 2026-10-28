import type {ViewportProps} from './types';

/** Test a surface location against the globe horizon and the padded screen. */
export function isLocationVisibleOnGlobe(
  longitude: number,
  latitude: number,
  viewport: ViewportProps,
  padding: number,
): boolean {
  const {cameraPosition: camera, viewProjectionMatrix: m} = viewport.globe!;
  const lambda = (longitude * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  // deck.gl's globe common-space radius is 256.
  const x = Math.sin(lambda) * Math.cos(phi) * 256;
  const y = -Math.cos(lambda) * Math.cos(phi) * 256;
  const z = Math.sin(phi) * 256;
  if (x * (camera[0] - x) + y * (camera[1] - y) + z * (camera[2] - z) < 0) {
    return false;
  }
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w <= 0) return false;
  const clipX = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  const clipY = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  return (
    Math.abs(clipX) <= 1 + (2 * padding) / viewport.width &&
    Math.abs(clipY) <= 1 + (2 * padding) / viewport.height
  );
}
