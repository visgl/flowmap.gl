import {FlowmapLayer} from '@flowmap.gl/layers';
import {COLOR_SCHEMES} from '@flowmap.gl/data';

export const UI_INITIAL = {
  darkMode: true,
  colorScheme: 'Teal',
  highlightColor: '#ff9b29',
  fadeEnabled: FlowmapLayer.defaultProps.fadeEnabled,
  fadeOpacityEnabled: FlowmapLayer.defaultProps.fadeOpacityEnabled,
  fadeAmount: FlowmapLayer.defaultProps.fadeAmount,
  clusteringEnabled: FlowmapLayer.defaultProps.clusteringEnabled,
  clusteringAuto: FlowmapLayer.defaultProps.clusteringAuto,
  clusteringLevel: 5,
  animationEnabled: FlowmapLayer.defaultProps.animationEnabled,
  adaptiveScalesEnabled: FlowmapLayer.defaultProps.adaptiveScalesEnabled,
  locationTotalsEnabled: FlowmapLayer.defaultProps.locationTotalsEnabled,
  maxTopFlowsDisplayNum: FlowmapLayer.defaultProps.maxTopFlowsDisplayNum,
};

export const initLilGui = (gui) => {
  gui.add(UI_INITIAL, 'darkMode');
  gui.add(UI_INITIAL, 'colorScheme', Object.keys(COLOR_SCHEMES));
  gui.addColor(UI_INITIAL, 'highlightColor');
  gui.add(UI_INITIAL, 'animationEnabled');
  gui.add(UI_INITIAL, 'adaptiveScalesEnabled');
  gui.add(UI_INITIAL, 'locationTotalsEnabled');

  gui
    .add(UI_INITIAL, 'maxTopFlowsDisplayNum')
    .min(0)
    .max(10000)
    .enable(FlowmapLayer.defaultProps.maxTopFlowsDisplayNum);

  const fading = gui.addFolder('Fade');
  const fadeEnabled = fading.add(UI_INITIAL, 'fadeEnabled');
  const fadeOpacityEnabled = fading
    .add(UI_INITIAL, 'fadeOpacityEnabled')
    .enable(FlowmapLayer.defaultProps.fadeEnabled);
  const fadeAmount = fading
    .add(UI_INITIAL, 'fadeAmount')
    .min(0)
    .max(100)
    .enable(FlowmapLayer.defaultProps.fadeEnabled);
  fadeEnabled.onChange((v) => {
    fadeAmount.enable(v);
    fadeOpacityEnabled.enable(v);
  });
  const clustering = gui.addFolder('Clustering');
  const clusteringEnabled = clustering.add(UI_INITIAL, 'clusteringEnabled');
  const clusteringAuto = clustering.add(UI_INITIAL, 'clusteringAuto');
  const clusteringLevel = clustering
    .add(UI_INITIAL, 'clusteringLevel')
    .min(0)
    .max(20)
    .step(1)
    .enable(!FlowmapLayer.defaultProps.clusteringAuto);
  clusteringEnabled.onChange((v) => {
    clusteringAuto.enable(v);
    clusteringLevel.enable(v);
  });
  clusteringAuto
    .enable(FlowmapLayer.defaultProps.clusteringEnabled)
    .onChange((v) => {
      clusteringLevel.enable(!v);
    });
};
