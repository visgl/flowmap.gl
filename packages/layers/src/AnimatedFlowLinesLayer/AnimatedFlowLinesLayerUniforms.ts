import type {ShaderModule} from '@luma.gl/shadertools';

const uniformBlock = `\
layout(std140) uniform animatedFlowLinesUniforms {
  float thicknessUnit;
  float animationTailLength;
  float currentTime;
  vec2 panOffset;
  vec3 screenOrigin;
} animatedFlowLines;
const float ANIMATED_FLOW_SPEED = 0.015;
`;

export type AnimatedFlowLinesProps = {
  thicknessUnit: number;
  animationTailLength: number;
  currentTime: number;
  panOffset: [number, number];
  screenOrigin: [number, number, number];
};

export const animatedFlowLinesUniforms = {
  name: 'animatedFlowLines',
  vs: uniformBlock,
  fs: uniformBlock,
  uniformTypes: {
    thicknessUnit: 'f32',
    animationTailLength: 'f32',
    currentTime: 'f32',
    panOffset: 'vec2<f32>',
    screenOrigin: 'vec3<f32>',
  },
} as const satisfies ShaderModule<AnimatedFlowLinesProps>;
