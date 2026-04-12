import type {ShaderModule} from '@luma.gl/shadertools';

const uniformBlock = `\
layout(std140) uniform flowCirclesUniforms {
  vec4 emptyColor;
  float outlineEmptyMix;
} flowCircles;
`;

export type FlowCirclesProps = {
  emptyColor: [number, number, number, number];
  outlineEmptyMix: number;
};

export const flowCirclesUniforms = {
  name: 'flowCircles',
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    emptyColor: 'vec4<f32>',
    outlineEmptyMix: 'f32',
  },
} as const satisfies ShaderModule<FlowCirclesProps>;
