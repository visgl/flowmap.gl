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
import {Geometry, type Model} from '@luma.gl/engine';

/**
 * Shortest-path routes across the antimeridian on flat (Web Mercator) maps,
 * following deck.gl's `LineLayer` `wrapLongitude`.
 *
 * Each flow instance contains two copies of its mesh, keeping both halves in
 * magnitude order in a single draw. Side +1 moves one endpoint by +360° and
 * keeps the part west of the 180th meridian. Side -1 moves the other endpoint
 * by -360° and keeps the part east of -180°. Non-crossing routes use only +1.
 *
 * deck.gl splits a line's geometry at the meridian. Flow arrows have heads,
 * outlines and bows that cannot be split as simply, so each copy draws the
 * whole arrow and clips its fragments at the meridian's line on screen
 * instead. The two halves are translations of each other by 360°, so where the
 * map repeats copies of the world they meet without a seam or overlap.
 */
export const antimeridian = {
  name: 'antimeridian',
  dependencies: [project32 as ShaderModule],
  vs: `\
layout(std140) uniform antimeridianUniforms {
  float enabled;
  float splitVertex;
} antimeridian;

out float antimeridian_vDistance;
float antimeridian_side = 1.0;
bool antimeridian_crossing = false;

float antimeridian_normalize(float lng) {
  return abs(lng) > 180.0 ? mod(lng + 180.0, 360.0) - 180.0 : lng;
}

// Takes the shorter way between the endpoints (longitude in x). Returns false
// when this copy draws nothing for the route.
bool antimeridian_wrap(inout vec3 source, inout vec3 target) {
  antimeridian_side = float(gl_VertexID) < antimeridian.splitVertex ? 1.0 : -1.0;
  antimeridian_vDistance = -1.0;
  if (antimeridian.enabled == 0.0 || project.projectionMode == PROJECTION_MODE_GLOBE) {
    return antimeridian_side > 0.0;
  }
  source.x = antimeridian_normalize(source.x);
  target.x = antimeridian_normalize(target.x);
  float delta = target.x - source.x;
  if (abs(delta) <= 180.0) {
    return antimeridian_side > 0.0;
  }
  // Side +1 moves the western endpoint east, side -1 the eastern one west.
  if ((delta > 0.0) == (antimeridian_side > 0.0)) {
    source.x += 360.0 * antimeridian_side;
  } else {
    target.x += 360.0 * antimeridian_side;
  }
  antimeridian_crossing = true;
  return true;
}

// Records which side of this copy's meridian a vertex is drawn on, from its
// final clip-space position. Call it after DECKGL_FILTER_GL_POSITION.
//
// The meridian and the camera span a plane. In clip space it holds the eye,
// (0, 0, z, 0), so it is a homogeneous line in (x, y, w): the one through the
// meridian's projected point and the vanishing point of its direction. A
// fragment is past the meridian when its pixel's view ray is, wherever
// extrusion in screen or common space put the vertex. The test is linear in
// clip coordinates, so perspective-correct interpolation keeps it exact.
void antimeridian_setPosition(vec4 position_clipspace) {
  if (antimeridian_crossing) {
    // Project at the origin's latitude to share the vertices' offset path.
    vec4 meridian = project_common_position_to_clipspace(vec4(project_position(
      vec3(180.0 * antimeridian_side, project.coordinateOrigin.y, 0.0)
    ), 1.0));
    vec3 line = cross(
      meridian.xyw,
      (project.viewProjectionMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyw
    );
    // Orient the line so it is positive beyond the meridian.
    float beyond = dot(
      line,
      (project.viewProjectionMatrix * vec4(antimeridian_side, 0.0, 0.0, 0.0)).xyw
    );
    antimeridian_vDistance = sign(beyond) * dot(line, position_clipspace.xyw);
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
  uniformTypes: {enabled: 'f32', splitVertex: 'f32'},
} as const satisfies ShaderModule<{enabled: number; splitVertex: number}>;

/**
 * Duplicate the small shared mesh, not the per-flow attributes. Both copies
 * belong to the same instance, preserving draw order and picking indices.
 * Triangle strips need two repeated vertices to disconnect the copies.
 */
export function createAntimeridianGeometry({
  topology,
  attributes,
}: {
  topology: 'triangle-list' | 'triangle-strip';
  attributes: Record<string, {size: number; value: Float32Array}>;
}): Geometry {
  const vertexCount =
    attributes.positions.value.length / attributes.positions.size;
  const bridge = topology === 'triangle-strip' ? 2 : 0;
  const doubled: typeof attributes = {};
  for (const [name, {size, value}] of Object.entries(attributes)) {
    const copies = new Float32Array((2 * vertexCount + bridge) * size);
    copies.set(value);
    if (bridge) {
      copies.set(value.subarray(value.length - size), value.length);
      copies.set(value.subarray(0, size), value.length + size);
    }
    copies.set(value, value.length + bridge * size);
    doubled[name] = {size, value: copies};
  }
  // Keep the original count so unwrapped/globe draws process only one copy.
  return new Geometry({topology, vertexCount, attributes: doubled});
}

/** Draw both mesh copies only in flat geospatial views with wrapping enabled. */
export function drawAntimeridian(
  layer: Layer,
  model: Model,
  vertexCount: number,
): void {
  const {wrapLongitude, coordinateSystem} = layer.props;
  const {viewport} = layer.context;
  const enabled =
    wrapLongitude &&
    viewport.isGeospatial &&
    !(viewport instanceof GlobeViewport) &&
    (coordinateSystem === COORDINATE_SYSTEM.LNGLAT ||
      coordinateSystem === COORDINATE_SYSTEM.DEFAULT);
  const bridge = model.topology === 'triangle-strip' ? 2 : 0;
  model.setVertexCount(enabled ? 2 * vertexCount + bridge : vertexCount);
  model.shaderInputs.setProps({
    antimeridian: {
      enabled: enabled ? 1 : 0,
      // Split between the repeated strip vertices. Derive the side from the
      // vertex ID so wrapping does not consume an extra attribute slot.
      splitVertex: vertexCount + bridge / 2,
    },
  });
  model.draw(layer.context.renderPass!);
}
