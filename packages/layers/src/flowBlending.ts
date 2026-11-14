import {picking, type Effect} from '@deck.gl/core';
import type {ShaderModule} from '@luma.gl/shadertools';
import type {Model} from '@luma.gl/engine';
import type {Parameters} from '@luma.gl/core';

export type BlendingMode = 'normal' | 'non-accumulating';

export interface FlowBlendingProps {
  blendingMode?: BlendingMode;
  darkMode?: boolean;
  /** Explicit layer parameters. Their depth settings override the defaults. */
  parameters?: Parameters;
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
 * cannot inherit stale min/max parameters. Picking owns its encoding factors.
 *
 * Depth testing and writes are only defaults, as in globe mode: explicit
 * layer parameters win. The blend equations define the mode and always apply. */
export function applyFlowBlending(
  model: Model,
  props: FlowBlendingProps,
  pickingActive: boolean,
) {
  model.shaderInputs.setProps({flowBlending: getFlowBlendingUniforms(props)});
  if (props.blendingMode === 'non-accumulating' && !pickingActive) {
    const {depthCompare = 'always', depthWriteEnabled = false} =
      props.parameters ?? {};
    model.setParameters({
      ...model.parameters,
      depthCompare,
      depthWriteEnabled,
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
 * Pair this style with getFlowmapCanvasEffects for frame-level clearing.
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

/**
 * Effects for a separate flowmap canvas. Clear once per frame so repeated
 * worlds survive, and leave picking buffers to deck.gl. Do not install these
 * effects on an interleaved canvas, whose destination is the basemap itself.
 */
export function getFlowmapCanvasEffects(props: FlowBlendingProps): Effect[] {
  const clearColor = getFlowmapCanvasClearColor(props);
  return clearColor ? [createCanvasClearEffect(clearColor)] : [];
}

function createCanvasClearEffect(clearColor: readonly number[]): Effect {
  // Render-pass colors use 0..1; the canvas helper returns 0..255.
  const color = clearColor.map((value) => value / 255);
  return {
    id: 'flowmap-canvas-clear',
    props: {},
    useInPicking: false,
    preRender(options) {
      if (!options.isPicking && options.clearCanvas !== false) {
        options.clearColor = color;
      }
    },
    setup() {},
    cleanup() {},
  };
}

export const flowBlending = {
  name: 'flowBlending',
  // deck.gl 9.4 widens several picking uniform types to string.
  dependencies: [picking as ShaderModule],
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
