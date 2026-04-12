/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, picking, project32} from '@deck.gl/core';
import {FlowLinesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {Geometry, Model} from '@luma.gl/engine';
import {LayerProps} from '../types';
import FragmentShader from './FlowLinesLayerFragment.glsl';
import {flowLinesUniforms} from './FlowLinesLayerUniforms';
import VertexShader from './FlowLinesLayerVertex.glsl';

export interface Props<F> extends LayerProps {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: {[key: string]: Record<string, unknown>};
  data: F[] | FlowLinesLayerAttributes;
  drawOutline: boolean;
  outlineColor?: RGBA;
  outlineThickness?: number;
  thicknessUnit?: number;
  getSourcePosition?: (d: F) => [number, number];
  getTargetPosition?: (d: F) => [number, number];
  getColor?: (d: F) => RGBA;
  getThickness?: (d: F) => number;
  getPickable?: (d: F, {index}: {index: number}) => number; // >= 1.0 -> true
  getEndpointOffsets?: (d: F) => [number, number];
}

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];

// source_target_mix, perpendicular_offset_in_thickness_units, direction_of_travel_offset_in_thickness_units
// prettier-ignore
const POSITIONS = [
  1, 0, 0,  // 0
  1, 2, -3, // 1
  1, 1, -3, // 2


  1, 0, 0,  // 0
  1, 1, -3, // 2
  0, 1, 0,  // 3


  1, 0, 0,  // 0
  0, 1, 0,  // 3
  0, 0, 0,  // 4
];
/**
                                    1
                                    ··
                                    · ··
                                    ·    ··
     3                            2 ·      ··
      ·······························        ··
      · ·······                       ····      ··
      ·       ········                   ·····     ··
      ·               ···············        ·····   ··
      ·                             ········      ········
      ·                                     ················
    4 ························································  0

 */
const INNER_SIDE_OUTLINE_THICKNESS = 0.5;

// Base per-vertex pixel offsets for the fill shape.
const PIXEL_OFFSETS = new Float32Array(9 * 2);

// Coefficients for the extra per-vertex expansion when outline rendering is enabled.
// Multiplied by `outlineThickness` in the vertex shader.
// prettier-ignore
const OUTLINE_OFFSET_COEFFICIENTS = new Float32Array([
  0, 2,
  2, -1,
  1, -1,

  0, 2,
  1, -1,
  1, -1,

  0, 2,
  1, -1,
  0, -1,
]);

// Constant pixel tweaks applied regardless of outline thickness to keep the
// leading arrowhead from visually swallowing the opposite edge.
// prettier-ignore
const OUTLINE_OFFSET_CONSTANTS = new Float32Array([
  -INNER_SIDE_OUTLINE_THICKNESS, 0,
  0, 0,
  0, 0,

  -INNER_SIDE_OUTLINE_THICKNESS, 0,
  0, 0,
  0, 0,

  -INNER_SIDE_OUTLINE_THICKNESS, 0,
  0, 0,
  -INNER_SIDE_OUTLINE_THICKNESS, 0,
]);

// One barycentric basis per triangle. After interpolation in the fragment shader,
// each component goes to 0 on the edge opposite its vertex, which lets us compute
// a stable pixel distance to each triangle edge using `fwidth`.
// prettier-ignore
const BARYCENTRICS = new Float32Array([
  1, 0, 0,
  0, 1, 0,
  0, 0, 1,

  1, 0, 0,
  0, 1, 0,
  0, 0, 1,

  1, 0, 0,
  0, 1, 0,
  0, 0, 1,
]);

// Each component maps to the edge opposite the matching barycentric component.
// A value of 1 means "this is a real polygon boundary edge that may receive the
// inset outline"; 0 means "ignore this edge" so the fragment shader does not draw
// seams along the internal triangle splits used to build the arrow shape.
// prettier-ignore
const EDGE_MASKS = new Float32Array([
  1, 0, 1,
  1, 0, 1,
  1, 0, 1,

  1, 0, 0,
  1, 0, 0,
  1, 0, 0,

  1, 1, 0,
  1, 1, 0,
  1, 1, 0,
]);

class FlowLinesLayer<F> extends Layer {
  static layerName = 'FlowLinesLayer';

  state!: {
    model?: Model;
  };

  static defaultProps = {
    getSourcePosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getTargetPosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getColor: {type: 'accessor', value: DEFAULT_COLOR},
    getThickness: {type: 'accessor', value: (d: any) => d.count}, // 0..0.5
    getPickable: {type: 'accessor', value: (d: any) => 1.0},
    drawOutline: true,
    thicknessUnit: 12,
    outlineThickness: 1,
    outlineColor: [255, 255, 255, 255],
    parameters: {
      depthTest: false,
    },
  };
  // props!: Props;

  constructor(props: Props<F>) {
    super(props);
  }

  getShaders(): Record<string, unknown> {
    return super.getShaders({
      vs: VertexShader,
      fs: FragmentShader,
      modules: [project32, picking, flowLinesUniforms],
    });
  }

  initializeState(): void {
    this.getAttributeManager()!.addInstanced({
      instanceSourcePositions: {
        accessor: 'getSourcePosition',
        size: 3,
        transition: false,
        type: 'float64',
      },
      instanceTargetPositions: {
        accessor: 'getTargetPosition',
        size: 3,
        transition: false,
        type: 'float64',
      },
      instanceThickness: {
        accessor: 'getThickness',
        size: 1,
        transition: false,
      },
      instanceEndpointOffsets: {
        accessor: 'getEndpointOffsets',
        size: 2,
        transition: false,
      },
      instanceColors: {
        accessor: 'getColor',
        size: 4,
        type: 'unorm8',
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

  updateState(params: any): void {
    super.updateState(params);
    const {changeFlags} = params;

    if (!this.state.model || changeFlags.extensionsChanged) {
      this.state.model?.destroy();
      this.setState({model: this._getModel()});
      this.getAttributeManager()!.invalidateAll();
    }
  }

  draw(): void {
    const {
      drawOutline = true,
      outlineColor = [255, 255, 255, 255],
      outlineThickness = 1,
      thicknessUnit = 12,
    } = this.props as unknown as Props<F>;
    const model = this.state.model;
    if (!model) {
      return;
    }
    model.shaderInputs.setProps({
      flowLines: {
        outlineColor: outlineColor.map((x: number) => x / 255) as [
          number,
          number,
          number,
          number,
        ],
        thicknessUnit: thicknessUnit * 2.0,
        outlineThickness,
        drawOutline: drawOutline ? 1 : 0,
        gap: 0.5,
      },
    });
    model.draw(this.context.renderPass as any);
  }

  _getModel(): Model {
    const {id} = this.props as unknown as Props<F>;

    return new Model(this.context.device as any, {
      id,
      ...this.getShaders(),
      bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
      geometry: new Geometry({
        topology: 'triangle-list',
        attributes: {
          positions: {size: 3, value: new Float32Array(POSITIONS)},
          pixelOffsets: {size: 2, value: PIXEL_OFFSETS},
          outlineOffsetCoefficients: {
            size: 2,
            value: OUTLINE_OFFSET_COEFFICIENTS,
          },
          outlineOffsetConstants: {
            size: 2,
            value: OUTLINE_OFFSET_CONSTANTS,
          },
          barycentrics: {size: 3, value: BARYCENTRICS},
          edgeMasks: {size: 3, value: EDGE_MASKS},
        },
      }),
      isInstanced: true,
    });
  }
}

export default FlowLinesLayer;
