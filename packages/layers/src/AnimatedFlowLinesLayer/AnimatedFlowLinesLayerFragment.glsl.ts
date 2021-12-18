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
#define SHADER_NAME animated-flow-lines-layer-fragment-shader

precision highp float;

uniform float animationTailLength;

varying vec4 vColor;
varying float sourceToTarget;
varying vec2 uv;
                                   
void main(void) {
  geometry.uv = uv;

  gl_FragColor = vec4(vColor.xyz, vColor.w * smoothstep(1.0 - animationTailLength, 1.0, fract(sourceToTarget)));

  DECKGL_FILTER_COLOR(gl_FragColor, geometry);
}
`;
