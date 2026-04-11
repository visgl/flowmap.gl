/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
export default `\
#version 300 es
#define SHADER_NAME flow-circles-layer-vertex-shader
#define radiusScale 100

in vec3 positions;

in vec3 instancePositions;
in vec3 instancePositions64Low;
in float instanceInRadius;
in float instanceOutRadius;
in vec4 instanceColors;
in vec3 instancePickingColors;

out vec4 vColor;
out vec2 unitPosition;
out float unitInRadius;
out float unitOutRadius;

void main(void) {
  geometry.worldPosition = instancePositions;

  float outerRadiusPixels = max(instanceInRadius, instanceOutRadius);
  unitInRadius = instanceInRadius / outerRadiusPixels; 
  unitOutRadius = instanceOutRadius / outerRadiusPixels; 

  // position on the containing square in [-1, 1] space
  unitPosition = positions.xy;
  geometry.uv = unitPosition;
  geometry.pickingColor = instancePickingColors;
                                                                                                    
  // Find the center of the point and add the current vertex
  vec3 offset = positions * project_pixel_size(outerRadiusPixels);
  DECKGL_FILTER_SIZE(offset, geometry);
  gl_Position = project_position_to_clipspace(instancePositions, instancePositions64Low, offset, geometry.position);
  DECKGL_FILTER_GL_POSITION(gl_Position, geometry);
                            
  // Apply opacity to instance color, or return instance picking color
  vColor = vec4(instanceColors.rgb, instanceColors.a * layer.opacity);
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
