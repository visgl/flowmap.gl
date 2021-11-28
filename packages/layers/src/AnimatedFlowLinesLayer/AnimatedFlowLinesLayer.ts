/*
 * Copyright 2019 Teralytics
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {Layer, picking, project32} from '@deck.gl/core';
import GL from '@luma.gl/constants';
import {Geometry, Model} from '@luma.gl/core';
import FragmentShader from './AnimatedFlowLinesLayerFragment.glsl';
import VertexShader from './AnimatedFlowLinesLayerVertex.glsl';
import {LayerProps} from '../LayerProps';
import {
  AccessorObjectInfo,
  Flow,
  FlowLinesLayerAttributes,
  RGBA,
} from '@flowmap.gl/data';

export interface Props extends LayerProps {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: {[key: string]: {}};
  data: Flow[] | FlowLinesLayerAttributes;
  drawOutline: boolean;
  outlineColor?: RGBA;
  outlineThickness?: number;
  currentTime?: number;
  thicknessUnit?: number;
  animationTailLength?: number;
  getSourcePosition?: (d: Flow) => [number, number];
  getTargetPosition?: (d: Flow) => [number, number];
  getStaggering?: (d: Flow, info: AccessorObjectInfo) => number;
  getPickable?: (d: Flow, {index}: {index: number}) => number; // >= 1.0 -> true
  getColor?: (d: Flow) => RGBA;
  getThickness?: (d: Flow) => number;
  getEndpointOffsets?: (d: Flow) => [number, number];
}

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];

export default class AnimatedFlowLinesLayer extends Layer {
  static defaultProps = {
    currentTime: 0,
    animationTailLength: 0.7,
    getSourcePosition: {type: 'accessor', value: (d: Flow) => [0, 0]},
    getTargetPosition: {type: 'accessor', value: (d: Flow) => [0, 0]},
    getPickable: {type: 'accessor', value: (d: Flow) => 1.0},
    getStaggering: {
      type: 'accessor',
      value: (d: Flow, {index}: {index: number}) => Math.random(),
    },
    getColor: {type: 'accessor', value: DEFAULT_COLOR},
    getThickness: {type: 'accessor', value: 1},
    thicknessUnit: 15 * 2,
    parameters: {
      depthTest: false,
    },
  };

  constructor(props: Props) {
    super(props);
  }

  getShaders() {
    return super.getShaders({
      vs: VertexShader,
      fs: FragmentShader,
      modules: [project32, picking],
      shaderCache: this.context.shaderCache,
    });
  }

  initializeState() {
    const attributeManager = this.getAttributeManager();

    /* eslint-disable max-len */
    attributeManager.addInstanced({
      instanceSourcePositions: {
        size: 3,
        transition: true,
        accessor: 'getSourcePosition',
      },
      instanceTargetPositions: {
        size: 3,
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
    const {currentTime, thicknessUnit, animationTailLength} = this.props;
    this.state.model
      .setUniforms({
        ...uniforms,
        thicknessUnit: thicknessUnit! * 4,
        animationTailLength,
        currentTime,
      })
      .draw();
  }

  _getModel(gl: WebGLRenderingContext) {
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
