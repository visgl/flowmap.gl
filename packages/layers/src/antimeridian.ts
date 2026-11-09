/*
 * Copyright (c) Flowmap.gl contributors
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  COORDINATE_SYSTEM,
  _GlobeViewport as GlobeViewport,
  project32,
  type Layer,
} from '@deck.gl/core';
import type {ShaderModule} from '@luma.gl/shadertools';

/**
 * Shortest-path routes across the antimeridian on flat (Web Mercator) maps,
 * following deck.gl's `LineLayer` `wrapLongitude`.
 *
 * A route whose endpoints are more than 180° of longitude apart is drawn twice.
 * Pass +1 moves one endpoint by +360° so the route crosses the 180th meridian,
 * and keeps the part west of it. Pass -1 moves the other endpoint by -360° and
 * keeps the part east of the -180th meridian. Every other route is drawn once,
 * in pass +1.
 *
 * deck.gl splits a line's geometry at the meridian. Flow arrows have heads,
 * outlines and bows that cannot be split as simply, so each pass draws the
 * whole arrow and clips its fragments at the meridian instead. The two halves
 * are translations of each other by 360°, so where the map repeats copies of
 * the world they meet without a seam or overlap.
 */
export const antimeridian = {
  name: 'antimeridian',
  dependencies: [project32 as ShaderModule],
  vs: `\
layout(std140) uniform antimeridianUniforms {
  float side;
} antimeridian;

out float antimeridian_vDistance;
bool antimeridian_crossing = false;

float antimeridian_normalize(float lng) {
  return abs(lng) > 180.0 ? mod(lng + 180.0, 360.0) - 180.0 : lng;
}

// Takes the shorter way between the endpoints (longitude in x). Returns false
// when this pass draws nothing for the route.
bool antimeridian_wrap(inout vec3 source, inout vec3 target) {
  antimeridian_vDistance = -1.0;
  if (antimeridian.side == 0.0 || project.projectionMode == PROJECTION_MODE_GLOBE) {
    // Great circles need no wrapping. Draw once, even if called for two passes.
    return antimeridian.side >= 0.0;
  }
  source.x = antimeridian_normalize(source.x);
  target.x = antimeridian_normalize(target.x);
  float delta = target.x - source.x;
  if (abs(delta) <= 180.0) {
    return antimeridian.side > 0.0;
  }
  // Pass +1 moves the western endpoint east, pass -1 the eastern one west.
  if ((delta > 0.0) == (antimeridian.side > 0.0)) {
    source.x += 360.0 * antimeridian.side;
  } else {
    target.x += 360.0 * antimeridian.side;
  }
  antimeridian_crossing = true;
  return true;
}

// Records how far past this pass's meridian a vertex lies, in common space.
// Mercator x is linear in longitude, so this interpolates exactly.
void antimeridian_setPosition(vec3 position_commonspace) {
  if (antimeridian_crossing) {
    // Project at the origin's latitude to share the vertices' offset path.
    float meridian = project_position(
      vec3(180.0 * antimeridian.side, project.coordinateOrigin.y, 0.0)
    ).x;
    antimeridian_vDistance = antimeridian.side * (position_commonspace.x - meridian);
  }
}
`,
  fs: `\
in float antimeridian_vDistance;

void antimeridian_clip() {
  if (antimeridian_vDistance > 0.0) {
    discard;
  }
}
`,
  uniformTypes: {side: 'f32'},
} as const satisfies ShaderModule<{side: number}>;

/**
 * Draw passes for a flow layer: [+1, -1] to wrap at the antimeridian, or [0]
 * for a single unwrapped pass. Only flat geospatial views wrap.
 */
export function getAntimeridianPasses(layer: Layer): number[] {
  const {wrapLongitude, coordinateSystem} = layer.props;
  const {viewport} = layer.context;
  return wrapLongitude &&
    viewport.isGeospatial &&
    !(viewport instanceof GlobeViewport) &&
    (coordinateSystem === COORDINATE_SYSTEM.LNGLAT ||
      coordinateSystem === COORDINATE_SYSTEM.DEFAULT)
    ? [1, -1]
    : [0];
}
