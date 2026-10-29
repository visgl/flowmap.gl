/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {Layer, picking, project32} from '@deck.gl/core';
import {FlowLinesLayerAttributes, RGBA} from '@flowmap.gl/data';
import {Geometry, Model} from '@luma.gl/engine';
import {flowLinesUniforms} from '../FlowLinesLayer/FlowLinesLayerUniforms';
import {LayerProps} from '../types';
import {
  flowBlending,
  applyFlowBlending,
  type FlowBlendingProps,
} from '../flowBlending';
import FragmentShader from './CurvedFlowLinesLayerFragment.glsl';
import getVertexShader from './CurvedFlowLinesLayerVertex.glsl';

export interface Props<F> extends LayerProps, FlowBlendingProps {
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
  getPickable?: (d: F, {index}: {index: number}) => number;
  getEndpointOffsets?: (d: F) => [number, number];
  getCurveOffset?: (d: F) => number;
  curviness?: number;
  /** Number of segments along the route. Defaults to 24. */
  numSegments?: number;
}

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];
const SHAFT_SEGMENTS = 24;

type GeometryBuffers = {
  positions: Float32Array;
  barycentrics: Float32Array;
  edgeMasks: Float32Array;
};

export default class CurvedFlowLinesLayer<F> extends Layer {
  static layerName = 'CurvedFlowLinesLayer';

  state!: {
    model?: Model;
  };

  static defaultProps = {
    getSourcePosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getTargetPosition: {type: 'accessor', value: (d: any) => [0, 0]},
    getColor: {type: 'accessor', value: DEFAULT_COLOR},
    getThickness: {type: 'accessor', value: (d: any) => d.count},
    getPickable: {type: 'accessor', value: () => 1.0},
    getCurveOffset: {type: 'accessor', value: () => 0},
    drawOutline: true,
    thicknessUnit: 12,
    outlineThickness: 1,
    outlineColor: [255, 255, 255, 255],
    curviness: 1,
    numSegments: {type: 'number', value: SHAFT_SEGMENTS, min: 2, max: 512},
    parameters: {
      depthTest: false,
    },
  };

  private get numSegments(): number {
    const value =
      (this.props as unknown as Props<F>).numSegments ?? SHAFT_SEGMENTS;
    return Math.max(2, Math.min(512, Math.round(value)));
  }

  getShaders(): Record<string, unknown> {
    return super.getShaders({
      vs: getVertexShader(this.numSegments),
      fs: FragmentShader,
      modules: [project32, picking, flowBlending, flowLinesUniforms],
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
      instanceCurveOffset: {
        accessor: 'getCurveOffset',
        size: 1,
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
    const {
      drawOutline = true,
      outlineColor = [255, 255, 255, 255],
      outlineThickness = 1,
      thicknessUnit = 12,
      curviness = 1,
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
        curviness,
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
    const geometry = buildGeometry(this.numSegments);

    return new Model(this.context.device as any, {
      id,
      ...this.getShaders(),
      bufferLayout: this.getAttributeManager()!.getBufferLayouts(),
      geometry: new Geometry({
        topology: 'triangle-list',
        attributes: {
          positions: {size: 3, value: geometry.positions},
          barycentrics: {size: 3, value: geometry.barycentrics},
          edgeMasks: {size: 3, value: geometry.edgeMasks},
        },
      }),
      isInstanced: true,
    });
  }
}

function buildGeometry(segments: number): GeometryBuffers {
  const HEAD_START_T = 1 - 1 / segments;
  const positions: number[] = [];
  const barycentrics: number[] = [];
  const edgeMasks: number[] = [];

  const pushTriangle = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    mask: [number, number, number],
  ) => {
    positions.push(...a, ...b, ...c);
    barycentrics.push(1, 0, 0, 0, 1, 0, 0, 0, 1);
    edgeMasks.push(...mask, ...mask, ...mask);
  };

  for (let index = 0; index < segments - 1; index++) {
    const t0 = index / segments;
    const t1 = (index + 1) / segments;
    pushTriangle(
      [t0, 1, 0],
      [t1, 1, 0],
      [t0, 0, 0],
      [0, index === 0 ? 1 : 0, 1],
    );
    pushTriangle([t0, 0, 0], [t1, 1, 0], [t1, 0, 0], [0, 1, 0]);
  }

  pushTriangle(
    [HEAD_START_T, 1, 0],
    [1, 1.7, -4.4],
    [HEAD_START_T, 0, 0],
    [0, 0, 1],
  );
  pushTriangle([HEAD_START_T, 0, 0], [1, 1.7, -4.4], [1, 0, 0], [1, 1, 0]);

  return {
    positions: new Float32Array(positions),
    barycentrics: new Float32Array(barycentrics),
    edgeMasks: new Float32Array(edgeMasks),
  };
}
