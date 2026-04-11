/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
export default `\
#version 300 es
#define SHADER_NAME flow-line-layer-vertex-shader

in vec3 positions;
in vec2 pixelOffsets;
in vec2 outlineOffsetCoefficients;
in vec2 outlineOffsetConstants;
in vec3 barycentrics;
in vec3 edgeMasks;
in vec4 instanceColors;
in float instanceThickness;    // 0..0.5
in vec3 instanceSourcePositions;
in vec3 instanceTargetPositions;
in vec3 instanceSourcePositions64Low;
in vec3 instanceTargetPositions64Low;
in vec3 instancePickingColors;
in vec2 instanceEndpointOffsets;
in float instancePickable;

out vec4 vColor;
out vec2 uv;
// Interpolated barycentric coordinates let the fragment shader measure distance
// to triangle edges in screen pixels without extra geometry.
out vec3 vBarycentrics;
// The edge mask is constant per triangle and tells the fragment shader which
// barycentric edges are real outline candidates vs internal triangulation seams.
flat out vec3 vEdgeMask;

void main(void) {
  geometry.worldPosition = instanceSourcePositions;
  geometry.worldPositionAlt = instanceTargetPositions;
  
  // Position
  vec4 source_commonspace;    
  vec4 target_commonspace;
  project_position_to_clipspace(instanceSourcePositions, instanceSourcePositions64Low, vec3(0.), source_commonspace);
  project_position_to_clipspace(instanceTargetPositions, instanceTargetPositions64Low, vec3(0.), target_commonspace);

  // linear interpolation of source & target to pick right coord
  float sourceOrTarget = positions.x;
  geometry.position = mix(source_commonspace, target_commonspace, sourceOrTarget);
  uv = positions.xy;
  geometry.uv = uv;
  vBarycentrics = barycentrics;
  vEdgeMask = edgeMasks;
  if (instancePickable > 0.5) {
    geometry.pickingColor = instancePickingColors;
  }
  
  // set the clamp limits in pixel size 
  float lengthCommon = length(target_commonspace - source_commonspace);    
  vec2 limitedOffsetDistances = clamp(   
    project_pixel_size(positions.yz) * flowLines.thicknessUnit,
    -lengthCommon*.8, lengthCommon*.8
  );
  float startOffsetCommon = project_pixel_size(instanceEndpointOffsets[0]);
  float endOffsetCommon = project_pixel_size(instanceEndpointOffsets[1]);
  float endpointOffset = mix(
    clamp(startOffsetCommon, 0.0, lengthCommon*.2),
    -clamp(endOffsetCommon, 0.0, lengthCommon*.2),
    positions.x
  );

  vec2 flowlineDir = normalize(target_commonspace.xy - source_commonspace.xy);
  vec2 perpendicularDir = vec2(-flowlineDir.y, flowlineDir.x);
  vec2 outlinePixelOffset = (
    outlineOffsetCoefficients * flowLines.outlineThickness +
    outlineOffsetConstants
  ) * flowLines.drawOutline;
  vec2 pixelOffsetCommon = project_pixel_size(pixelOffsets + outlinePixelOffset);
  float gapCommon = project_pixel_size(flowLines.gap);
  vec3 offsetCommon = vec3(
    flowlineDir * (instanceThickness * limitedOffsetDistances[1] + pixelOffsetCommon.y + endpointOffset * 1.05) -
    perpendicularDir * (instanceThickness * limitedOffsetDistances[0] + gapCommon + pixelOffsetCommon.x),
    0.0
  );
  
  DECKGL_FILTER_SIZE(offsetCommon, geometry);
  vec4 position_commonspace = mix(source_commonspace, target_commonspace, sourceOrTarget);
  vec4 offset_commonspace = vec4(offsetCommon, 0.0);
  gl_Position = project_common_position_to_clipspace(position_commonspace + offset_commonspace);
      
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
  
  vec4 fillColor = vec4(instanceColors.rgb, instanceColors.a * layer.opacity);
  vColor = fillColor;
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
