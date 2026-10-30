/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
import globeArc from '../globe-arc.glsl';

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
in float instanceStaggering;

out vec4 vColor;
out float sourceToTarget;
out vec2 uv;

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
  geometry.uv = uv;
  if (instancePickable > 0.5) {
    geometry.pickingColor = picking_getPickingColorFromInstanceID();
  }

  // Route length in the units of the flat clip-space length below, so that
  // the pulses keep the same on-screen spacing in both projections.
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
    // At zero pitch, a flat route covering one CSS pixel has a clip-space
    // length of 3 / height vertically and 3 / width horizontally (clip space
    // includes the camera's w of 1.5). Weight these by the route's on-screen
    // direction so that spacing matches the flat map in any orientation.
    vec4 startClip = project_common_position_to_clipspace(vec4(globeArc_point(arc, 0.0, 0.0), 1.0));
    vec4 endClip = project_common_position_to_clipspace(vec4(globeArc_point(arc, 1.0, 0.0), 1.0));
    vec2 screenDirection = (endClip.xy / endClip.w - startClip.xy / startClip.w) * project.viewportSize;
    vec2 clipPerPixel = 3.0 * project.devicePixelRatio / project.viewportSize;
    float clipPerRoutePixel = length(screenDirection) > 1e-6
      ? length(normalize(screenDirection) * clipPerPixel)
      : clipPerPixel.y;
    routeLength = globeArc_length(arc) / project_pixel_size(1.0) * clipPerRoutePixel;
  } else {
    vec4 source_commonspace;
    vec4 target_commonspace;
    vec4 source = project_position_to_clipspace(instanceSourcePositions, instanceSourcePositions64Low, vec3(0.), source_commonspace);
    vec4 target = project_position_to_clipspace(instanceTargetPositions, instanceTargetPositions64Low, vec3(0.), target_commonspace);

    // linear interpolation of source & target to pick right coord
    vec4 p = mix(source, target, segmentIndex);
    geometry.position = mix(source_commonspace, target_commonspace, segmentIndex);

    // extrude
    vec3 offset = vec3(
      getExtrusionOffset(target.xy - source.xy, positions.y, widthPixels),
      0.0);
    DECKGL_FILTER_SIZE(offset, geometry);
    gl_Position = p + vec4(project_pixel_size_to_clipspace(offset.xy), 0.0, 0.0);
    routeLength = length(source - target);
  }
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  // Color
  vColor = vec4(instanceColors.rgb, instanceColors.a * layer.opacity);
  DECKGL_FILTER_COLOR(vColor, geometry);

  sourceToTarget = positions.x * routeLength * NUM_PARTS - animatedFlowLines.currentTime * SPEED + instanceStaggering;
}
`;
