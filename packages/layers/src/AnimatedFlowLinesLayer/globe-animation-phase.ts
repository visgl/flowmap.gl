/*
 * Copyright (c) Flowmap.gl contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import type {_GlobeViewport as GlobeViewport} from '@deck.gl/core';

type Position = [number, number, number];
export type AnimationRoute = {
  source: Position;
  target: Position;
  staggering: number;
};
type PreparedRoute = AnimationRoute & {
  id: string;
  sourceCommon: number[];
  targetCommon: number[];
  start: number[];
  end: number[];
  tangent: number[];
  angle: number;
  surfaceLength: number;
};
type RoutePhase = {route: PreparedRoute; phase: number};
type ViewHistory = {
  viewport: GlobeViewport;
  revision: number;
  routes: PreparedRoute[];
  phases: Map<string, RoutePhase>;
  values: Float32Array;
};
const dot = (a: number[], b: number[]) =>
  a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v: number[]) => {
  const length = Math.max(Math.hypot(...v), 1e-12);
  return v.map((x) => x / length);
};
const viewCenter = (viewport: GlobeViewport) =>
  unit(
    viewport.projectPosition(
      viewport.unproject([viewport.width / 2, viewport.height / 2]),
    ),
  );
const key = (route: AnimationRoute) =>
  JSON.stringify([route.source, route.target, route.staggering]);
const fract = (x: number) => x - Math.floor(x);

function prepare(
  route: AnimationRoute,
  viewport: GlobeViewport,
): PreparedRoute {
  const source = viewport.projectPosition(route.source);
  const target = viewport.projectPosition(route.target);
  const start = unit(source);
  const end = unit(target);
  const cosine = Math.max(-1, Math.min(1, dot(start, end)));
  const cross = [
    start[1] * end[2] - start[2] * end[1],
    start[2] * end[0] - start[0] * end[2],
    start[0] * end[1] - start[1] * end[0],
  ];
  const angle = Math.atan2(Math.hypot(...cross), cosine);
  let tangent = end.map((x, i) => x - start[i] * cosine);
  if (Math.hypot(...tangent) < 1e-6) {
    const axis = Math.abs(start[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    tangent = [
      axis[1] * start[2] - axis[2] * start[1],
      axis[2] * start[0] - axis[0] * start[2],
      axis[0] * start[1] - axis[1] * start[0],
    ];
  }
  tangent = unit(tangent);
  return {
    ...route,
    id: key(route),
    sourceCommon: source,
    targetCommon: target,
    start,
    end,
    tangent,
    angle,
    surfaceLength: Math.max(Math.hypot(...source) * angle, 1e-6),
  };
}

function project(position: number[], matrix: number[]) {
  const [x, y, z] = position;
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15];
  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / w,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / w,
  ];
}

// Mirror the shader's surface-distance calibration. Static spherical geometry
// and viewport center are cached outside this per-route measurement.
function measure(
  route: PreparedRoute,
  viewport: GlobeViewport,
  center: number[],
) {
  const {start, end, tangent, angle} = route;
  const theta = Math.atan2(dot(center, tangent), dot(center, start));
  const anchor =
    theta >= 0 && theta <= angle
      ? theta / Math.max(angle, 1e-12)
      : dot(center, start) >= dot(center, end)
        ? 0
        : 1;
  const from = project(route.sourceCommon, viewport.pixelProjectionMatrix);
  const to = project(route.targetCommon, viewport.pixelProjectionMatrix);
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const clipPerPixel =
    length > 1e-6
      ? Math.hypot(
          ((dx / length) * 3) / viewport.width,
          ((dy / length) * 3) / viewport.height,
        )
      : 3 / viewport.height;
  const periods = route.surfaceLength * viewport.scale * clipPerPixel * 5;
  return {anchor, periods};
}

/** Per-route phase history; camera changes never change the surface derivative. */
export class GlobeAnimationPhase {
  private views = new Map<string, ViewHistory>();

  reset(id: string): void {
    this.views.delete(id);
  }

  get(
    viewport: GlobeViewport,
    revision: number,
    getRoutes: () => AnimationRoute[],
  ): Float32Array {
    const previous = this.views.get(viewport.id);
    if (previous?.viewport === viewport && previous.revision === revision)
      return previous.values;
    // GlobeController changes raw zoom during latitude pans to preserve scale;
    // other integrations can pan at fixed raw zoom. Neither is a zoom gesture.
    const zooming =
      previous &&
      Math.abs(viewport.zoom - previous.viewport.zoom) > 1e-9 &&
      Math.abs(Math.log2(viewport.scale / previous.viewport.scale)) > 1e-9;
    if (previous && previous.revision === revision && !zooming) {
      previous.viewport = viewport;
      return previous.values;
    }
    const routes =
      previous?.revision === revision
        ? previous.routes
        : getRoutes().map(
            (route) =>
              previous?.phases.get(key(route))?.route ??
              prepare(route, viewport),
          );
    const phases = new Map<string, RoutePhase>();
    const values = new Float32Array(routes.length);
    const beforeCenter = zooming ? viewCenter(previous.viewport) : [];
    const afterCenter = zooming ? viewCenter(viewport) : [];
    routes.forEach((route, i) => {
      const id = route.id;
      const old = previous?.phases.get(id);
      let phase = old?.phase ?? 0;
      if (old !== undefined && zooming) {
        const before = measure(route, previous.viewport, beforeCenter);
        const after = measure(route, viewport, afterCenter);
        // Keep phase at the visible anchor while retaining the shader's
        // original surface wavelength and time derivative.
        phase = fract(
          old.phase +
            before.anchor * before.periods -
            after.anchor * after.periods,
        );
      }
      phases.set(id, {route, phase});
      values[i] = phase;
    });
    this.views.set(viewport.id, {viewport, revision, routes, phases, values});
    return values;
  }
}
