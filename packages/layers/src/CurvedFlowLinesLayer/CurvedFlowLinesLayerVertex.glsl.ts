/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
const HEAD_START_T = (1 - 1 / 24).toFixed(8);

export default `\
#version 300 es
#define SHADER_NAME curved-flow-line-layer-vertex-shader

in vec3 positions;
in vec3 barycentrics;
in vec3 edgeMasks;
in vec4 instanceColors;
in float instanceThickness;
in vec3 instanceSourcePositions;
in vec3 instanceTargetPositions;
in vec3 instanceSourcePositions64Low;
in vec3 instanceTargetPositions64Low;
in vec3 instancePickingColors;
in vec2 instanceEndpointOffsets;
in float instancePickable;
in float instanceCurveOffset;

out vec4 vColor;
out vec2 uv;
out vec3 vBarycentrics;
flat out vec3 vEdgeMask;

vec3 quadraticBezier(vec3 p0, vec3 p1, vec3 p2, float t) {
  float oneMinusT = 1.0 - t;
  return
    oneMinusT * oneMinusT * p0 +
    2.0 * oneMinusT * t * p1 +
    t * t * p2;
}

vec3 quadraticBezierTangent(vec3 p0, vec3 p1, vec3 p2, float t) {
  return 2.0 * (1.0 - t) * (p1 - p0) + 2.0 * t * (p2 - p1);
}

void main(void) {
  geometry.worldPosition = instanceSourcePositions;
  geometry.worldPositionAlt = instanceTargetPositions;

  vec4 source_commonspace;
  vec4 target_commonspace;
  project_position_to_clipspace(
    instanceSourcePositions,
    instanceSourcePositions64Low,
    vec3(0.0),
    source_commonspace
  );
  project_position_to_clipspace(
    instanceTargetPositions,
    instanceTargetPositions64Low,
    vec3(0.0),
    target_commonspace
  );

  vec2 chord = target_commonspace.xy - source_commonspace.xy;
  float chordLengthCommon = max(length(chord), 1e-6);
  float startTrim = clamp(
    project_pixel_size(instanceEndpointOffsets.x) / chordLengthCommon,
    0.0,
    0.35
  );
  float endTrim = 1.0 - clamp(
    project_pixel_size(instanceEndpointOffsets.y) / chordLengthCommon,
    0.0,
    0.35
  );
  endTrim = max(startTrim + 0.05, endTrim);
  float headBacktrackT = clamp(
    project_pixel_size(instanceThickness * 3.0 * flowLines.thicknessUnit) / chordLengthCommon,
    0.02,
    0.25
  );
  float shaftEndTrim = max(startTrim + 0.02, endTrim - headBacktrackT);

  float curveT = positions.x < 1.0
    ? mix(startTrim, shaftEndTrim, positions.x / ${HEAD_START_T})
    : endTrim;
  vec2 curveNormal = normalize(vec2(chord.y, -chord.x));
  if (length(curveNormal) < 1e-6) {
    curveNormal = vec2(0.0, 1.0);
  }
  vec3 control_commonspace = mix(
    source_commonspace.xyz,
    target_commonspace.xyz,
    0.5
  );
  control_commonspace.xy += curveNormal * project_pixel_size(abs(instanceCurveOffset));

  vec3 curvePoint = quadraticBezier(
    source_commonspace.xyz,
    control_commonspace,
    target_commonspace.xyz,
    curveT
  );
  vec3 tangent = quadraticBezierTangent(
    source_commonspace.xyz,
    control_commonspace,
    target_commonspace.xyz,
    curveT
  );
  if (length(tangent.xy) < 1e-6) {
    tangent = target_commonspace.xyz - source_commonspace.xyz;
  }

  vec2 flowlineDir = normalize(tangent.xy);
  vec2 perpendicularDir = vec2(-flowlineDir.y, flowlineDir.x);
  float normalDistanceCommon = clamp(
    project_pixel_size(instanceThickness * positions.y * flowLines.thicknessUnit),
    -chordLengthCommon * 0.8,
    chordLengthCommon * 0.8
  );
  float tangentDistanceCommon = clamp(
    project_pixel_size(instanceThickness * positions.z * flowLines.thicknessUnit),
    -chordLengthCommon * 0.8,
    chordLengthCommon * 0.8
  );
  float gapCommon = project_pixel_size(flowLines.gap);
  vec3 offsetCommon = vec3(
    flowlineDir * tangentDistanceCommon -
      perpendicularDir * (normalDistanceCommon + gapCommon),
    0.0
  );

  geometry.position = vec4(curvePoint, 1.0);
  uv = vec2(curveT, positions.y);
  geometry.uv = uv;
  vBarycentrics = barycentrics;
  vEdgeMask = edgeMasks;
  if (instancePickable > 0.5) {
    geometry.pickingColor = instancePickingColors;
  }

  DECKGL_FILTER_SIZE(offsetCommon, geometry);
  vec4 position_commonspace = vec4(curvePoint + offsetCommon, 1.0);
  gl_Position = project_common_position_to_clipspace(position_commonspace);
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);

  vec4 fillColor = vec4(instanceColors.rgb, instanceColors.a * layer.opacity);
  vColor = fillColor;
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
