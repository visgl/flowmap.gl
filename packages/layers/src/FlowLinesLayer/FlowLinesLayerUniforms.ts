import type {ShaderModule} from '@luma.gl/shadertools';

const uniformBlock = `\
layout(std140) uniform flowLinesUniforms {
  vec4 outlineColor;
  float thicknessUnit;
  float outlineThickness;
  float drawOutline;
  float gap;
} flowLines;
`;

export type FlowLinesProps = {
  outlineColor: [number, number, number, number];
  thicknessUnit: number;
  outlineThickness: number;
  drawOutline: number;
  gap: number;
};

export const flowLinesUniforms = {
  name: 'flowLines',
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    outlineColor: 'vec4<f32>',
    thicknessUnit: 'f32',
    outlineThickness: 'f32',
    drawOutline: 'f32',
    gap: 'f32',
  },
} as const satisfies ShaderModule<FlowLinesProps>;
