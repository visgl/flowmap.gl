/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, picking, project32} from '@deck.gl/core';
import {Geometry, Model} from '@luma.gl/engine';
import FragmentShader from './FlowLinesLayerFragment.glsl';
import VertexShader from './FlowLinesLayerVertex.glsl';
import {FlowLinesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {LayerProps} from '../types';
import {flowLinesUniforms} from './FlowLinesLayerUniforms';

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
const INNER_SIDE_OUTLINE_THICKNESS = 1;

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

function getOutlinePixelOffsets(tout: number, tin: number) {
  // perpendicular_offset_in_pixels, direction_of_travel_offset_in_pixels, fill_outline_color_mix
  // prettier-ignore
  return ([

    -tin, 2*tout, 1,   // 0
    2*tout, -tout, 1,  // 1
    tout, -tout, 1,   // 2

    -tin, 2*tout, 1, // 0
    tout, -tout, 1,  // 2
    tout, -tout, 1,  // 3

    -tin, 2*tout, 1, // 0
    tout, -tout, 1,  // 3
    -tin, -tout, 1,  // 4
  ]);
}

// prettier-ignore
const ZEROES = [
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
  0, 0, 0,
];

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
    const {outlineColor = [255, 255, 255, 255], thicknessUnit = 12} = this
      .props as unknown as Props<F>;
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
        gap: 0.5,
      },
    });
    model.draw(this.context.renderPass as any);
  }

  _getModel(): Model {
    const {
      drawOutline,
      outlineThickness = 1,
      id,
    } = this.props as unknown as Props<F>;
    let positions: number[] = [];
    let pixelOffsets: number[] = [];

    if (drawOutline) {
      // source_target_mix, perpendicular_offset_in_thickness_units, direction_of_travel_offset_in_thickness_units
      positions = positions.concat(POSITIONS);
      const tout = outlineThickness;
      const tin = INNER_SIDE_OUTLINE_THICKNESS; // the outline shouldn't cover the opposite arrow
      pixelOffsets = pixelOffsets.concat(getOutlinePixelOffsets(tout, tin));
    }

    positions = positions.concat(POSITIONS);
    pixelOffsets = pixelOffsets.concat(ZEROES);

    return new Model(this.context.device as any, {
      id,
      ...this.getShaders(),
      bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
      geometry: new Geometry({
        topology: 'triangle-list',
        attributes: {
          positions: {size: 3, value: new Float32Array(positions)},
          normals: {size: 3, value: new Float32Array(pixelOffsets)},
        },
      }),
      isInstanced: true,
    });
  }
}

export default FlowLinesLayer;
