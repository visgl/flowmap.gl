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
flat in float vHasReverseFlow;

out vec4 fragColor;
                                   
void main(void) {
  antimeridian_clip();
  geometry.uv = uv;

  // Keep the right half relative to travel, matching the highlighted arrow.
  // Reversing direction flips sides; one-way flows keep their full hit area.
  if (bool(picking.isActive) && vHasReverseFlow > 0.5 && uv.y > 0.0) {
    discard;
  }

  fragColor = vec4(vColor.xyz, vColor.w * smoothstep(1.0 - animatedFlowLines.animationTailLength, 1.0, fract(sourceToTarget)));

  DECKGL_FILTER_COLOR(fragColor, geometry);
  float coverage = smoothstep(0.0, max(fwidth(uv.y), 1e-4), 1.0 - abs(uv.y));
  fragColor = flow_blend_color(fragColor, coverage);
}
`;
