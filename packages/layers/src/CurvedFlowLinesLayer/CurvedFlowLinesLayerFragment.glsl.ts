/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
export default `\
#version 300 es
#define SHADER_NAME curved-flow-line-layer-fragment-shader

precision highp float;

in vec4 vColor;
in vec2 uv;
in vec3 vBarycentrics;
flat in vec3 vEdgeMask;

out vec4 fragColor;

void main(void) {
  if (vColor.a == 0.0) {
    discard;
  }

  geometry.uv = uv;
  fragColor = vColor;

  if (flowLines.drawOutline > 0.5 && !bool(picking.isActive)) {
    vec3 edgeDistancePx = vBarycentrics / max(fwidth(vBarycentrics), vec3(1e-4));
    vec3 maskedDistancePx = mix(vec3(1e6), edgeDistancePx, step(vec3(0.5), vEdgeMask));
    float minBoundaryDistancePx = min(
      maskedDistancePx.x,
      min(maskedDistancePx.y, maskedDistancePx.z)
    );
    float outlineMix = 1.0 - smoothstep(
      max(flowLines.outlineThickness - 1.0, 0.0),
      flowLines.outlineThickness,
      minBoundaryDistancePx
    );
    fragColor = mix(
      fragColor,
      vec4(flowLines.outlineColor.rgb, flowLines.outlineColor.a * fragColor.a),
      outlineMix
    );
  }

  DECKGL_FILTER_COLOR(fragColor, geometry);
}
`;
