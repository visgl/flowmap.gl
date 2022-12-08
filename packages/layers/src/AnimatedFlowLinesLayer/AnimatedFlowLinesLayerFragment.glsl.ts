/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
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
