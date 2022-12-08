/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, picking, project32} from '@deck.gl/core';
import GL from '@luma.gl/constants';
import {Geometry, Model} from '@luma.gl/core';
import FragmentShader from './AnimatedFlowLinesLayerFragment.glsl';
import VertexShader from './AnimatedFlowLinesLayerVertex.glsl';
import {FlowLinesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {LayerProps} from '../types';
export interface Props<F> extends LayerProps {
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
    thicknessUnit: 15 * 2,
    parameters: {
      depthTest: false,
    },
  };

  constructor(props: Props<F>) {
    super(props);
  }

  getShaders(): Record<string, unknown> {
    return super.getShaders({
      vs: VertexShader,
      fs: FragmentShader,
      modules: [project32, picking],
      shaderCache: this.context.shaderCache,
    });
  }

  initializeState(): void {
    const attributeManager = this.getAttributeManager();

    /* eslint-disable max-len */
    attributeManager.addInstanced({
      instanceSourcePositions: {
        size: 3,
        type: GL.DOUBLE,
        transition: true,
        accessor: 'getSourcePosition',
      },
      instanceTargetPositions: {
        size: 3,
        type: GL.DOUBLE,
        transition: true,
        accessor: 'getTargetPosition',
      },
      instanceColors: {
        size: 4,
        type: GL.UNSIGNED_BYTE,
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
    /* eslint-enable max-len */
  }

  getNeedsRedraw(): boolean {
    return true;
  }

  updateState({props, oldProps, changeFlags}: Record<string, any>): void {
    super.updateState({props, oldProps, changeFlags});

    if (changeFlags.extensionsChanged) {
      const {gl} = this.context;
      this.state.model?.delete();
      this.state.model = this._getModel(gl);
      this.getAttributeManager().invalidateAll();
    }
  }

  draw({uniforms}: Record<string, any>): void {
    const {thicknessUnit, animationTailLength} = this.props;
    const timestamp = Date.now() / 1000;
    const animationTime = ((timestamp % loopTime) / loopTime) * loopLength;

    this.state.model
      .setUniforms({
        ...uniforms,
        thicknessUnit: thicknessUnit * 4,
        animationTailLength,
        currentTime: animationTime,
      })
      .draw();
  }

  _getModel(gl: WebGLRenderingContext): Record<string, unknown> {
    /*
     *  (0, -1)-------------_(1, -1)
     *       |          _,-"  |
     *       o      _,-"      o
     *       |  _,-"          |
     *   (0, 1)"-------------(1, 1)
     */
    const positions = [0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0];

    return new Model(
      gl,
      Object.assign({}, this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: GL.TRIANGLE_STRIP,
          attributes: {
            positions: new Float32Array(positions),
          },
        }),
        isInstanced: true,
      }),
    );
  }
}
