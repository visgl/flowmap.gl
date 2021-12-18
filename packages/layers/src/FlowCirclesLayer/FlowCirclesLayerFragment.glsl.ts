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
#define SHADER_NAME flow-circles-layer-fragment-shader
#define SOFT_OUTLINE 0.1
#define EPS 0.05
precision highp float;

uniform vec4 emptyColor;
uniform vec4 emptyOutlineColor;

varying vec4 vColor;
varying vec2 unitPosition;
varying float unitInRadius;
varying float unitOutRadius;

float when_gt(float x, float y) {
  return max(sign(x - y), 0.0);
}

void main(void) {
  geometry.uv = unitPosition;
  float distToCenter = length(unitPosition);
  if (distToCenter > 1.0) {
    discard;
  }

  // See https://stackoverflow.com/questions/47285778
  vec4 ringColor = mix(
    emptyColor / 255., vColor,
    when_gt(unitInRadius, unitOutRadius)
  );
  vec4 outlineColor = mix(
    emptyOutlineColor / 255., vColor,
    when_gt(unitInRadius, unitOutRadius)
  );
  
  float innerR = min(unitInRadius, unitOutRadius) * (1.0 - SOFT_OUTLINE);
  
  // Inner circle
  float step2 = innerR - EPS; 
  float step3 = innerR;
  
  // Ring
  float step4 = innerR + EPS;
  float step5 = 1.0 - SOFT_OUTLINE - EPS*2.0;
  float step6 = 1.0 - SOFT_OUTLINE;
  
  gl_FragColor = vColor;
  gl_FragColor = mix(gl_FragColor, emptyColor / 255., smoothstep(step2, step3, distToCenter));
  gl_FragColor = mix(gl_FragColor, ringColor, smoothstep(step3, step4, distToCenter));
  gl_FragColor = mix(gl_FragColor, outlineColor, smoothstep(step5, step6, distToCenter));
  gl_FragColor = mix(gl_FragColor, emptyColor / 255., smoothstep(step6, 1.0, distToCenter));
  gl_FragColor.a *= smoothstep(0.0, SOFT_OUTLINE, 1.0 - distToCenter);
  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
`;
