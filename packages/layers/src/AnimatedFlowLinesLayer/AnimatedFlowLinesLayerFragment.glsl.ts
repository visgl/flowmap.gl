/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

export default `\
#version 300 es
#define SHADER_NAME animated-flow-lines-layer-fragment-shader

precision highp float;

in vec4 vColor;
in float sourceToTarget;
in vec2 uv;

out vec4 fragColor;
                                   
void main(void) {
  geometry.uv = uv;

  fragColor = vec4(vColor.xyz, vColor.w * smoothstep(1.0 - animatedFlowLines.animationTailLength, 1.0, fract(sourceToTarget)));

  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
