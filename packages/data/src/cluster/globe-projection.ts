/*
 * Copyright (c) Flowmap.gl contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// Circumference one, matching normalized Mercator units at the equator.
const RADIUS = 1 / (2 * Math.PI);
type Point = {x: number; y: number; z?: number};

export function projectGlobe(longitude: number, latitude: number) {
  const lambda = (longitude * Math.PI) / 180;
  const phi = (latitude * Math.PI) / 180;
  return {
    x: RADIUS * Math.cos(phi) * Math.cos(lambda),
    y: RADIUS * Math.cos(phi) * Math.sin(lambda),
    z: RADIUS * Math.sin(phi),
  };
}

export function globeCentroid(x: number, y: number, z: number, seed: Point) {
  const length = Math.hypot(x, y, z);
  // Balanced antipodes have no unique center. Keep the seed rather than NaNs.
  if (length < 1e-12) return {x: seed.x, y: seed.y, z: seed.z!};
  const scale = RADIUS / length;
  return {x: x * scale, y: y * scale, z: z * scale};
}

export function unprojectGlobe(point: Point) {
  return {
    lon: (Math.atan2(point.y, point.x) * 180) / Math.PI,
    lat: (Math.atan2(point.z!, Math.hypot(point.x, point.y)) * 180) / Math.PI,
  };
}

/** A 3D spatial hash avoids flattening latitude at the equator. */
export function indexGlobePoints(points: Point[], radius: number) {
  const cells = new Map<string, number[]>();
  const coordinate = (value: number) => Math.floor(value / radius);
  points.forEach((point, index) => {
    const key = `${coordinate(point.x)},${coordinate(point.y)},${coordinate(point.z!)}`;
    const cell = cells.get(key);
    if (cell) cell.push(index);
    else cells.set(key, [index]);
  });
  return (point: Point): number[] => {
    const x = coordinate(point.x);
    const y = coordinate(point.y);
    const z = coordinate(point.z!);
    const neighbors: number[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const cell = cells.get(`${x + dx},${y + dy},${z + dz}`);
          if (cell) for (const index of cell) neighbors.push(index);
        }
      }
    }
    return neighbors;
  };
}
