import type {ShaderModule} from '@luma.gl/shadertools';

const uniformBlock = `\
layout(std140) uniform animatedFlowLinesUniforms {
  float thicknessUnit;
  float animationTailLength;
  float currentTime;
} animatedFlowLines;
`;

export type AnimatedFlowLinesProps = {
  thicknessUnit: number;
  animationTailLength: number;
  currentTime: number;
};

export const animatedFlowLinesUniforms = {
  name: 'animatedFlowLines',
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    thicknessUnit: 'f32',
    animationTailLength: 'f32',
    currentTime: 'f32',
  },
} as const satisfies ShaderModule<AnimatedFlowLinesProps>;
