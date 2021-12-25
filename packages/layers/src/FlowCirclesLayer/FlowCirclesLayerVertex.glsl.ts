/*
 * Copyright 2022 FlowmapBlue
 * Copyright 2018-2020 Teralytics, modified by FlowmapBlue
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
export default `\
#define SHADER_NAME flow-circles-layer-vertex-shader
#define radiusScale 100

attribute vec3 positions;

attribute vec3 instancePositions;
attribute vec3 instancePositions64Low;
attribute float instanceInRadius;
attribute float instanceOutRadius;
attribute vec4 instanceColors;
attribute vec3 instancePickingColors;

uniform float opacity;
uniform vec4 emptyColor;
uniform float outlineEmptyMix;

varying vec4 vColor;
varying vec2 unitPosition;
varying float unitInRadius;
varying float unitOutRadius;

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
  vColor = vec4(instanceColors.rgb / 255., instanceColors.a / 255. * opacity);
  DECKGL_FILTER_COLOR(vColor, geometry);
}
`;
