/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, picking, project32} from '@deck.gl/core';
import {Geometry, Model} from '@luma.gl/engine';
import FragmentShader from './AnimatedFlowLinesLayerFragment.glsl';
import VertexShader from './AnimatedFlowLinesLayerVertex.glsl';
import {FlowLinesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {LayerProps} from '../types';
import {
  flowBlending,
  applyFlowBlending,
  type FlowBlendingProps,
} from '../flowBlending';
import {animatedFlowLinesUniforms} from './AnimatedFlowLinesLayerUniforms';
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
  };

  static defaultProps = {
    currentTime: 0,
    animationTailLength: 0.7,
    getSourcePosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getTargetPosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getPickable: {type: 'accessor', value: (d: any) => 1.0},
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
      modules: [project32, picking, flowBlending, animatedFlowLinesUniforms],
    });
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
    });
    this.setState({model: this._getModel()});
  }

  getNeedsRedraw(): string | false {
    return 'animation';
  }

  updateState(params: any): void {
    super.updateState(params);
    const {changeFlags, props, oldProps} = params;

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
    model.shaderInputs.setProps({
      animatedFlowLines: {
        thicknessUnit: thicknessUnit * 2.0,
        animationTailLength,
        currentTime: animationTime,
      },
    });
    applyFlowBlending(
      model,
      this.props as unknown as Props<F>,
      Boolean(options.shaderModuleProps?.picking?.isActive),
    );
    model.draw(this.context.renderPass as any);
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
      bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
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
