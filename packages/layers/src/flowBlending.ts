import type {ShaderModule} from '@luma.gl/shadertools';
import type {Model} from '@luma.gl/engine';
import type {Parameters} from '@luma.gl/core';

export type BlendingMode = 'normal' | 'non-accumulating';

export interface FlowBlendingProps {
  blendingMode?: BlendingMode;
  darkMode?: boolean;
}

/** Apply only to flow fills. Highlights keep ordinary source-over blending. */
export function getFlowBlendParameters({
  blendingMode,
  darkMode = true,
}: FlowBlendingProps): Parameters {
  return blendingMode === 'non-accumulating'
    ? {
        blend: true,
        blendColorOperation: darkMode ? 'max' : 'min',
        // RGB already includes opacity and coverage. Keep the result opaque,
        // including on a separate canvas, to avoid applying alpha a second time.
        blendAlphaOperation: 'max',
        blendColorSrcFactor: 'one',
        blendColorDstFactor: 'one',
        blendAlphaSrcFactor: 'one',
        blendAlphaDstFactor: 'one',
      }
    : {};
}

/** Deck resets model parameters before every draw, including picking. Derive
 * these here rather than in props so layer.clone({blendingMode: 'normal'})
 * cannot inherit stale min/max parameters. Picking owns its encoding factors. */
export function applyFlowBlending(
  model: Model,
  props: FlowBlendingProps,
  pickingActive: boolean,
) {
  if (props.blendingMode === 'non-accumulating' && !pickingActive) {
    model.setParameters({
      ...model.parameters,
      depthCompare: 'always',
      depthWriteEnabled: false,
      ...getFlowBlendParameters(props),
    });
  }
}

export function getFlowBlendingUniforms(props: FlowBlendingProps) {
  return {
    enabled: props.blendingMode === 'non-accumulating' ? 1 : 0,
    neutral: (props.darkMode ?? true) ? 0 : 1,
  };
}

/**
 * Separate canvases must clear to opaque white/black and use CSS darken/lighten.
 * Use clearColor on a deck.gl View with clear: true (values are 0..255).
 * Never clear an interleaved canvas: its destination is the basemap itself.
 */
export function getFlowmapCanvasStyle(props: FlowBlendingProps) {
  return {
    mixBlendMode: (props.blendingMode === 'non-accumulating'
      ? (props.darkMode ?? true)
        ? 'lighten'
        : 'darken'
      : (props.darkMode ?? true)
        ? 'screen'
        : 'darken') as 'lighten' | 'darken' | 'screen',
  };
}

export function getFlowmapCanvasClearColor(
  props: FlowBlendingProps,
): [number, number, number, number] | undefined {
  if (props.blendingMode !== 'non-accumulating') return undefined;
  const neutral = (props.darkMode ?? true) ? 0 : 255;
  return [neutral, neutral, neutral, 255];
}

export const flowBlending = {
  name: 'flowBlending',
  fs: `
layout(std140) uniform flowBlendingUniforms {
  float enabled;
  float neutral;
} flowBlending;

vec4 flow_blend_color(vec4 color, float coverage) {
  if (flowBlending.enabled > 0.5 && !bool(picking.isActive)) {
    return vec4(mix(vec3(flowBlending.neutral), color.rgb,
      clamp(color.a * coverage, 0.0, 1.0)), 1.0);
  }
  return color;
}
`,
  uniformTypes: {enabled: 'f32', neutral: 'f32'},
} as const satisfies ShaderModule<{enabled: number; neutral: number}>;
