/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
import globeArc from '../globe-arc.glsl.js';

export default `\
#version 300 es
#define SHADER_NAME animated-flow-lines-layer-vertex-shader
#define SPEED 0.015
#define NUM_PARTS 5.0

in vec3 positions;
in vec3 instanceSourcePositions;
in vec3 instanceTargetPositions;
in vec3 instanceSourcePositions64Low;
in vec3 instanceTargetPositions64Low;
in vec4 instanceColors;
in float instanceWidths;
in float instancePickable;
in float instanceHasReverseFlow;
in float instanceStaggering;

out vec4 vColor;
out float sourceToTarget;
out vec2 uv;
flat out float vHasReverseFlow;

// offset vector by strokeWidth pixels
// offset_direction is -1 (left) or 1 (right)
vec2 getExtrusionOffset(vec2 line_clipspace, float offset_direction, float width) {
  // normalized direction of the line
  vec2 dir_screenspace = normalize(line_clipspace * project.viewportSize);
  // rotate by 90 degrees
  dir_screenspace = vec2(-dir_screenspace.y, dir_screenspace.x);

  return dir_screenspace * offset_direction * width / 2.0;
}

${globeArc}

void main(void) {
  geometry.worldPosition = instanceSourcePositions;
  geometry.worldPositionAlt = instanceTargetPositions;

  float widthPixels = instanceWidths * animatedFlowLines.thicknessUnit;
  float segmentIndex = positions.x;
  uv = positions.xy;
  vHasReverseFlow = instanceHasReverseFlow;
  geometry.uv = uv;
  if (instancePickable > 0.5) {
    geometry.pickingColor = picking_getPickingColorFromInstanceID();
  }

  // No-op on the globe, where routes follow great circles.
  vec3 sourcePosition = instanceSourcePositions;
  vec3 targetPosition = instanceTargetPositions;
  bool drawn = antimeridian_wrap(sourcePosition, targetPosition);

  // Measure animation distance in map units so camera changes do not shift
  // the pulse phase at a fixed point along the route.
  float routeLength;
  if (project.projectionMode == PROJECTION_MODE_GLOBE) {
    // Follow the great circle on the sphere's surface.
    GlobeArc arc = globeArc_create(
      project_position(instanceSourcePositions, instanceSourcePositions64Low),
      project_position(instanceTargetPositions, instanceTargetPositions64Low)
    );
    vec3 point = globeArc_point(arc, segmentIndex, 0.0);
    vec3 normal;
    vec3 direction;
    globeArc_frame(arc, segmentIndex, 0.0, normal, direction);
    vec3 offset = cross(normal, direction) *
      project_pixel_size(positions.y * widthPixels / 2.0);
    DECKGL_FILTER_SIZE(offset, geometry);
    geometry.position = vec4(normalize(point + offset) * length(point), 1.0);
    gl_Position = project_common_position_to_clipspace(geometry.position);
    routeLength = globeArc_length(arc);
  } else {
    vec4 source_commonspace;
    vec4 target_commonspace;
    vec4 source = project_position_to_clipspace(sourcePosition, instanceSourcePositions64Low, vec3(0.), source_commonspace);
    vec4 target = project_position_to_clipspace(targetPosition, instanceTargetPositions64Low, vec3(0.), target_commonspace);

    // linear interpolation of source & target to pick right coord
    vec4 p = mix(source, target, segmentIndex);
    geometry.position = mix(source_commonspace, target_commonspace, segmentIndex);

    // extrude
    vec3 offset = vec3(
      getExtrusionOffset(target.xy - source.xy, positions.y, widthPixels),
      0.0);
    DECKGL_FILTER_SIZE(offset, geometry);
    gl_Position = p + vec4(project_pixel_size_to_clipspace(offset.xy), 0.0, 0.0);
    routeLength = length(target_commonspace.xyz - source_commonspace.xyz);
    if (!drawn) gl_Position = vec4(0.0);
  }
  if (project.coordinateSystem == COORDINATE_SYSTEM_LNGLAT) {
    // Use the same geographic distance on flat maps and globes, including
    // GlobeView's automatic switch to Mercator at high zoom. Subtract high/low
    // parts before converting to radians to retain short-route precision.
    vec2 delta = radians((instanceTargetPositions.xy - instanceSourcePositions.xy) +
      (instanceTargetPositions64Low.xy - instanceSourcePositions64Low.xy));
    vec2 latitudes = radians(vec2(instanceSourcePositions.y, instanceTargetPositions.y));
    vec2 halfChord = sin(delta / 2.0);
    float a = clamp(halfChord.y * halfChord.y + cos(latitudes.x) * cos(latitudes.y) * halfChord.x * halfChord.x, 0.0, 1.0);
    routeLength = 2.0 * EARTH_RADIUS * atan(sqrt(a), sqrt(1.0 - a));
  }
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
  antimeridian_setPosition(gl_Position);

  // Color
  vColor = vec4(instanceColors.rgb, instanceColors.a * layer.opacity);
  DECKGL_FILTER_COLOR(vColor, geometry);

  sourceToTarget = positions.x * routeLength * animatedFlowLines.animationDistanceScale * NUM_PARTS - animatedFlowLines.currentTime * SPEED + instanceStaggering;
}
`;
