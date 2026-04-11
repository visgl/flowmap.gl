/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, picking, project32} from '@deck.gl/core';
import {Geometry, Model} from '@luma.gl/engine';
import FragmentShader from './FlowCirclesLayerFragment.glsl';
import VertexShader from './FlowCirclesLayerVertex.glsl';
import {FlowCirclesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {LayerProps} from '../types';
import {flowCirclesUniforms} from './FlowCirclesLayerUniforms';

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

  state!: {
    model?: Model;
  };

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
      modules: [project32, picking, flowCirclesUniforms],
    });
  }

  initializeState() {
    this.getAttributeManager()!.addInstanced({
      instancePositions: {
        size: 3,
        type: 'float64',
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
        type: 'unorm8',
        accessor: 'getColor',
        defaultValue: DEFAULT_COLOR,
      },
    });
    this.setState({model: this._getModel()});
  }

  updateState(params: any) {
    super.updateState(params);
    const {changeFlags} = params;
    if (!this.state.model || changeFlags.extensionsChanged) {
      this.state.model?.destroy();
      this.setState({model: this._getModel()});
      this.getAttributeManager()!.invalidateAll();
    }
  }

  draw() {
    const {
      emptyColor = DEFAULT_EMPTY_COLOR,
      outlineEmptyMix = DEFAULT_OUTLINE_EMPTY_MIX,
    } = this.props as unknown as Props;
    const model = this.state.model;
    if (!model) {
      return;
    }
    model.shaderInputs.setProps({
      flowCircles: {
        emptyColor: emptyColor.map((x: number) => x / 255) as [
          number,
          number,
          number,
          number,
        ],
        outlineEmptyMix,
      },
    });
    model.draw(this.context.renderPass as any);
  }

  _getModel(): Model {
    const {id} = this.props as unknown as Props;
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0];

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

export default FlowCirclesLayer;
