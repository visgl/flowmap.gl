import assert from 'node:assert/strict';
import test from 'node:test';

test('@flowmap.gl/data loads in Node.js ESM', async () => {
  const {clusterLocations, LocalFlowmapDataProvider} =
    await import('@flowmap.gl/data');
  assert.equal(typeof clusterLocations, 'function');
  assert.equal(typeof LocalFlowmapDataProvider, 'function');
});

test('@flowmap.gl/layers loads in Node.js ESM without browser globals', async () => {
  const {
    AnimatedFlowLinesLayer,
    CurvedFlowLinesLayer,
    FlowCirclesLayer,
    FlowLinesLayer,
    FlowmapLayer,
    FlowmapLegendWidget,
    getFlowmapCanvasStyle,
    getFlowmapCanvasClearColor,
    getFlowmapCanvasEffects,
  } = await import('@flowmap.gl/layers');

  for (const exportedClass of [
    AnimatedFlowLinesLayer,
    CurvedFlowLinesLayer,
    FlowCirclesLayer,
    FlowLinesLayer,
    FlowmapLayer,
    FlowmapLegendWidget,
  ]) {
    assert.equal(typeof exportedClass, 'function');
  }
  assert.equal(typeof getFlowmapCanvasStyle, 'function');
  assert.equal(typeof getFlowmapCanvasClearColor, 'function');
  assert.equal(typeof getFlowmapCanvasEffects, 'function');
});
