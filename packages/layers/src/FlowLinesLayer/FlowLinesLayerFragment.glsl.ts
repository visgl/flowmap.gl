/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
export default `\
#version 300 es
#define SHADER_NAME flow-line-layer-fragment-shader

precision highp float;

in vec4 vColor;
in vec2 uv;

out vec4 fragColor;

void main(void) {
  if (vColor.a == 0.0) {
    discard;
  }

  geometry.uv = uv;
  fragColor = vColor;
  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
