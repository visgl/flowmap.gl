/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  _GlobeViewport as GlobeViewport,
  COORDINATE_SYSTEM,
  Layer,
  picking,
  project32,
  type Viewport,
} from '@deck.gl/core';
import {Buffer} from '@luma.gl/core';
import {
  GlobeAnimationPhase,
  type AnimationRoute,
} from './globe-animation-phase.js';
import {Geometry, Model} from '@luma.gl/engine';
import FragmentShader from './AnimatedFlowLinesLayerFragment.glsl.js';
import VertexShader from './AnimatedFlowLinesLayerVertex.glsl.js';
import {FlowLinesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {LayerProps} from '../types.js';
import {antimeridian, getAntimeridianPasses} from '../antimeridian.js';
import {
  flowBlending,
  applyFlowBlending,
  type FlowBlendingProps,
} from '../flowBlending.js';
import {animatedFlowLinesUniforms} from './AnimatedFlowLinesLayerUniforms.js';
export interface Props<F> extends LayerProps, FlowBlendingProps {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: {[key: string]: Record<string, unknown>};
  data: F[] | FlowLinesLayerAttributes;
  drawOutline: boolean;
  outlineColor?: RGBA;
  outlineThickness?: number;
  currentTime?: number;
  thicknessUnit?: number;
  animationTailLength?: number;
  getSourcePosition?: (d: F) => [number, number];
  getTargetPosition?: (d: F) => [number, number];
  getStaggering?: (d: F, info: AccessorObjectInfo) => number;
  getPickable?: (d: F, {index}: {index: number}) => number; // >= 1.0 -> true
  /** Split picking along the centerline when the reverse flow is also displayed. */
  getHasReverseFlow?: (d: F) => number;
  getColor?: (d: F) => RGBA;
  getThickness?: (d: F) => number;
  getEndpointOffsets?: (d: F) => [number, number];
  /** Number of segments along the route. Globe routes need enough to follow the sphere. */
  numSegments?: number;
}

// https://deck.gl/#/documentation/developer-guide/using-layers?section=accessors
export interface AccessorObjectInfo {
  index: number;
  data: any;
  target: any;
}

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];
const loopLength = 1800;
const animationSpeed = 20;
const loopTime = loopLength / animationSpeed;

export default class AnimatedFlowLinesLayer<F> extends Layer {
  state!: {
    model?: Model;
    globeAnimation: GlobeAnimationPhase;
    globePhaseBuffer?: Buffer;
    globePhaseValues?: Float32Array;
    animationRevision: number;
    animationViewports: Map<
      string,
      {viewport: Viewport; offset: [number, number]}
    >;
  };

  static defaultProps = {
    currentTime: 0,
    animationTailLength: 0.7,
    getSourcePosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getTargetPosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getPickable: {type: 'accessor', value: (d: any) => 1.0},
    getHasReverseFlow: {type: 'accessor', value: 0},
    getStaggering: {
      type: 'accessor',
      value: (d: any, {index}: {index: number}) => Math.random(),
    },
    getColor: {type: 'accessor', value: DEFAULT_COLOR},
    getThickness: {type: 'accessor', value: 1},
    thicknessUnit: 12,
    numSegments: {type: 'number', value: 1, min: 1, max: 512},
    parameters: {
      depthTest: false,
    },
  };

  constructor(props: Props<F>) {
    super(props);
  }

  private get numSegments(): number {
    const value = (this.props as unknown as Props<F>).numSegments ?? 1;
    return Math.max(1, Math.min(512, Math.round(value)));
  }

  getShaders(): Record<string, unknown> {
    return super.getShaders({
      vs: VertexShader,
      fs: FragmentShader,
      modules: [
        project32,
        picking,
        flowBlending,
        animatedFlowLinesUniforms,
        antimeridian,
      ],
    });
  }

  // Drawn in two passes instead; see antimeridian.ts.
  get wrapLongitude(): boolean {
    return false;
  }

  initializeState(): void {
    this.getAttributeManager()!.addInstanced({
      instanceSourcePositions: {
        size: 3,
        type: 'float64',
        transition: true,
        accessor: 'getSourcePosition',
      },
      instanceTargetPositions: {
        size: 3,
        type: 'float64',
        transition: true,
        accessor: 'getTargetPosition',
      },
      instanceColors: {
        size: 4,
        type: 'unorm8',
        transition: true,
        accessor: 'getColor',
        defaultValue: [0, 0, 0, 255],
      },
      instanceWidths: {
        size: 1,
        transition: true,
        accessor: 'getThickness',
        defaultValue: 1,
      },
      instanceStaggering: {
        accessor: 'getStaggering',
        size: 1,
        transition: false,
      },
      instancePickable: {
        accessor: 'getPickable',
        size: 1,
        transition: false,
      },
      instanceHasReverseFlow: {
        accessor: 'getHasReverseFlow',
        size: 1,
        transition: false,
      },
    });
    this.setState({
      model: this._getModel(),
      animationViewports: new Map(),
      globeAnimation: new GlobeAnimationPhase(),
      animationRevision: 0,
    });
  }

  getNeedsRedraw(): string | false {
    return 'animation';
  }

  updateState(params: any): void {
    super.updateState(params);
    const {changeFlags, props, oldProps} = params;
    if (
      changeFlags.dataChanged ||
      changeFlags.updateTriggersChanged ||
      props.numInstances !== oldProps.numInstances ||
      props.getSourcePosition !== oldProps.getSourcePosition ||
      props.getTargetPosition !== oldProps.getTargetPosition ||
      props.getStaggering !== oldProps.getStaggering
    ) {
      this.state.animationRevision++;
    }

    if (
      !this.state.model ||
      changeFlags.extensionsChanged ||
      props.numSegments !== oldProps.numSegments
    ) {
      this.state.model?.destroy();
      this.setState({model: this._getModel()});
      this.getAttributeManager()!.invalidateAll();
    }
  }

  draw(options: Parameters<Layer['draw']>[0]): void {
    const {thicknessUnit = 12, animationTailLength = 0.7} = this
      .props as unknown as Props<F>;
    const timestamp = Date.now() / 1000;
    const animationTime = ((timestamp % loopTime) / loopTime) * loopLength;

    const model = this.state.model;
    if (!model) {
      return;
    }
    const {viewport, device} = this.context;
    this._updateGlobeAnimation();
    const pixelRatio =
      options.shaderModuleProps?.project?.devicePixelRatio ??
      device.canvasContext!.cssToDeviceRatio();
    const framebufferHeight =
      options.renderPass.props.framebuffer?.height ??
      device.canvasContext!.getDrawingBufferSize()[1];
    model.shaderInputs.setProps({
      animatedFlowLines: {
        thicknessUnit: thicknessUnit * 2.0,
        animationTailLength,
        currentTime: animationTime,
        panOffset: this._getAnimationPanOffset(),
        screenOrigin: [
          (viewport.x + viewport.width / 2) * pixelRatio,
          framebufferHeight - (viewport.y + viewport.height / 2) * pixelRatio,
          pixelRatio,
        ],
      },
    });
    applyFlowBlending(
      model,
      this.props as unknown as Props<F>,
      Boolean(options.shaderModuleProps?.picking?.isActive),
    );
    for (const side of getAntimeridianPasses(this)) {
      model.shaderInputs.setProps({antimeridian: {side}});
      model.draw(this.context.renderPass as any);
    }
  }

  finalizeState(context: Parameters<Layer['finalizeState']>[0]): void {
    this.state.globePhaseBuffer?.destroy();
    super.finalizeState(context);
  }

  private _updateGlobeAnimation(): void {
    const {model} = this.state;
    const viewport =
      this.context.deck
        ?.getViewports()
        .find((view) => view.id === this.context.viewport.id) ??
      this.context.viewport;
    if (!(viewport instanceof GlobeViewport)) {
      model!.setConstantAttributes({
        instanceGlobePhaseOffset: new Float32Array([0]),
      });
      return;
    }
    const attributes = this.getAttributeManager()!.getAttributes();
    const {coordinateSystem, modelMatrix} = this.props;
    const geographic =
      coordinateSystem === COORDINATE_SYSTEM.DEFAULT ||
      coordinateSystem === COORDINATE_SYSTEM.LNGLAT;
    const untransformed =
      !modelMatrix ||
      Array.from(modelMatrix).every(
        (value, i) => value === (i % 5 === 0 ? 1 : 0),
      );
    // GPU-only inputs (including active GPU attribute transitions) cannot be
    // sampled here without a synchronous readback. Preserve their legacy phase.
    if (
      !geographic ||
      !untransformed ||
      !attributes.instanceSourcePositions.value ||
      !attributes.instanceTargetPositions.value ||
      !attributes.instanceStaggering.value
    ) {
      this.state.globeAnimation.reset(viewport.id);
      model!.setConstantAttributes({
        instanceGlobePhaseOffset: new Float32Array([0]),
      });
      return;
    }
    const values = this.state.globeAnimation.get(
      viewport,
      this.state.animationRevision,
      () => {
        const read = (name: string, index: number, size: number) => {
          const attribute = attributes[name];
          const value = attribute.value!;
          const accessor = attribute.getAccessor();
          const bytes =
            'BYTES_PER_ELEMENT' in value ? Number(value.BYTES_PER_ELEMENT) : 4;
          const offset = (accessor.offset ?? 0) / bytes;
          const componentCount = accessor.size ?? size;
          const stride = (accessor.stride || componentCount * bytes) / bytes;
          const start = offset + (attribute.isConstant ? 0 : index * stride);
          return Array.from({length: size}, (_, component) =>
            component < componentCount ? value[start + component] : 0,
          );
        };
        return Array.from(
          {length: this.getNumInstances()},
          (_, index): AnimationRoute => ({
            source: read(
              'instanceSourcePositions',
              index,
              3,
            ) as AnimationRoute['source'],
            target: read(
              'instanceTargetPositions',
              index,
              3,
            ) as AnimationRoute['target'],
            staggering: read('instanceStaggering', index, 1)[0],
          }),
        );
      },
    );
    if (this.state.globePhaseValues !== values) {
      if (
        !this.state.globePhaseBuffer ||
        this.state.globePhaseBuffer.byteLength < values.byteLength
      ) {
        this.state.globePhaseBuffer?.destroy();
        this.state.globePhaseBuffer = this.context.device.createBuffer({
          byteLength: Math.max(8, values.byteLength),
          usage: Buffer.VERTEX | Buffer.COPY_DST,
        });
      }
      if (values.length) this.state.globePhaseBuffer.write(values);
      this.state.globePhaseValues = values;
    }
    model!.setAttributes({
      instanceGlobePhaseOffset: this.state.globePhaseBuffer!,
    });
  }

  private _getAnimationPanOffset(): [number, number] {
    // Repeated-world and picking passes must share the logical view's history.
    const viewport =
      this.context.deck
        ?.getViewports()
        .find((view) => view.id === this.context.viewport.id) ??
      this.context.viewport;
    if (viewport instanceof GlobeViewport) return [0, 0];
    const previous = this.state.animationViewports.get(viewport.id);
    if (previous?.viewport === viewport) return previous.offset;
    const offset: [number, number] = previous ? [...previous.offset] : [0, 0];
    // Scroll/pinch zoom also moves the center to keep the cursor's anchor fixed.
    // Compensating that movement as a pan would reintroduce zoom-induced phase
    // shifts. Follow map translation only at a fixed zoom (allow rounding noise).
    if (previous && Math.abs(viewport.zoom - previous.viewport.zoom) < 1e-9) {
      const center = viewport.unprojectPosition(viewport.center);
      const oldCenter = previous.viewport.unprojectPosition(
        previous.viewport.center,
      );
      if (viewport.isGeospatial) {
        // A camera crossing the dateline pans a few pixels, not a whole world.
        oldCenter[0] =
          center[0] +
          ((((oldCenter[0] - center[0] + 180) % 360) + 360) % 360) -
          180;
      }
      const from = viewport.project(oldCenter, {topLeft: false});
      const to = viewport.project(center, {topLeft: false});
      offset[0] += from[0] - to[0];
      offset[1] += from[1] - to[1];
    }
    this.state.animationViewports.set(viewport.id, {viewport, offset});
    return offset;
  }

  _getModel(): Model {
    const {id} = this.props as unknown as Props<F>;
    /*
     *  (0, -1)-------------_(1, -1)
     *       |          _,-"  |
     *       o      _,-"      o
     *       |  _,-"          |
     *   (0, 1)"-------------(1, 1)
     *
     * With more segments, the strip repeats this quad along the route.
     */
    const positions: number[] = [];
    for (let i = 0; i <= this.numSegments; i++) {
      const t = i / this.numSegments;
      positions.push(t, -1, 0, t, 1, 0);
    }

    return new Model(this.context.device as any, {
      ...this.getShaders(),
      id,
      bufferLayout: [
        ...this.getAttributeManager()!.getBufferLayouts(),
        {
          name: 'instanceGlobePhaseOffset',
          format: 'float32',
          stepMode: 'instance',
        },
      ],
      geometry: new Geometry({
        topology: 'triangle-strip',
        attributes: {
          positions: {size: 3, value: new Float32Array(positions)},
        },
      }),
      isInstanced: true,
    });
  }
}
