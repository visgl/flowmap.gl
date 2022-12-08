/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, picking, project32} from '@deck.gl/core';
import GL from '@luma.gl/constants';
import {Geometry, Model} from '@luma.gl/core';
import FragmentShader from './FlowCirclesLayerFragment.glsl';
import VertexShader from './FlowCirclesLayerVertex.glsl';
import {FlowCirclesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {LayerProps} from '../types';

export type FlowCirclesDatum = Record<string, unknown>;

export interface Props extends LayerProps {
  id: string;
  opacity?: number;
  pickable?: boolean;
  emptyColor?: RGBA;
  outlineEmptyMix?: number;
  getColor?: (d: FlowCirclesDatum) => RGBA;
  getPosition?: (d: FlowCirclesDatum) => [number, number];
  getInRadius?: (d: FlowCirclesDatum) => number;
  getOutRadius?: (d: FlowCirclesDatum) => number;
  data: FlowCirclesDatum[] | FlowCirclesLayerAttributes;
  updateTriggers?: {[key: string]: Record<string, unknown>};
}

const DEFAULT_COLOR = [0, 0, 0, 255];
const DEFAULT_EMPTY_COLOR = [255, 255, 255, 255];
const DEFAULT_OUTLINE_EMPTY_MIX = 0.4;

class FlowCirclesLayer extends Layer {
  static layerName = 'FlowCirclesLayer';

  static defaultProps = {
    getColor: {type: 'accessor', value: DEFAULT_COLOR},
    emptyColor: {type: 'accessor', value: DEFAULT_EMPTY_COLOR},
    outlineEmptyMix: {type: 'accessor', value: DEFAULT_OUTLINE_EMPTY_MIX},
    getPosition: {type: 'accessor', value: (d: FlowCirclesDatum) => d.position},
    getInRadius: {type: 'accessor', value: 1},
    getOutRadius: {type: 'accessor', value: 1},
    parameters: {
      depthTest: false,
    },
  };
  // props!: Props;

  constructor(props: Props) {
    super(props);
  }

  getShaders() {
    return super.getShaders({
      vs: VertexShader,
      fs: FragmentShader,
      modules: [project32, picking],
    });
  }

  initializeState() {
    this.getAttributeManager().addInstanced({
      instancePositions: {
        size: 3,
        type: GL.DOUBLE,
        fp64: this.use64bitPositions(),
        transition: true,
        accessor: 'getPosition',
      },
      instanceInRadius: {
        size: 1,
        transition: true,
        accessor: 'getInRadius',
        defaultValue: 1,
      },
      instanceOutRadius: {
        size: 1,
        transition: true,
        accessor: 'getOutRadius',
        defaultValue: 1,
      },
      instanceColors: {
        size: 4,
        transition: true,
        type: GL.UNSIGNED_BYTE,
        accessor: 'getColor',
        defaultValue: DEFAULT_COLOR,
      },
    });
  }

  updateState({props, oldProps, changeFlags}: any) {
    super.updateState({props, oldProps, changeFlags});
    if (changeFlags.extensionsChanged) {
      const {gl} = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({model: this._getModel(gl)});
      this.getAttributeManager().invalidateAll();
    }
  }

  draw({uniforms}: any) {
    const {emptyColor, outlineEmptyMix} = this.props;
    this.state.model
      .setUniforms({
        ...uniforms,
        emptyColor,
        outlineEmptyMix,
      })
      .draw();
  }

  _getModel(gl: WebGLRenderingContext) {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0];

    return new Model(
      gl,
      Object.assign(this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: GL.TRIANGLE_FAN,
          vertexCount: 4,
          attributes: {
            positions: {size: 3, value: new Float32Array(positions)},
          },
        }),
        isInstanced: true,
      }),
    );
  }
}

export default FlowCirclesLayer;
