/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

export {default as AnimatedFlowLinesLayer} from './AnimatedFlowLinesLayer/index.js';
export {default as CurvedFlowLinesLayer} from './CurvedFlowLinesLayer/index.js';
export {default as FlowLinesLayer} from './FlowLinesLayer/index.js';
export {default as FlowCirclesLayer} from './FlowCirclesLayer/index.js';
export {default as FlowmapLayer} from './FlowmapLayer.js';
export type {FlowmapLayerProps} from './FlowmapLayer.js';
export {default as FlowmapLegendWidget} from './FlowmapLegendWidget.js';
export type {
  FlowmapLegendWidgetClassNames,
  FlowmapLegendWidgetProps,
  FlowmapLegendWidgetSection,
} from './FlowmapLegendWidget.js';

export * from './types.js';

export {
  getFlowmapCanvasStyle,
  getFlowmapCanvasClearColor,
  getFlowmapCanvasEffects,
} from './flowBlending.js';
export type {BlendingMode} from './flowBlending.js';
