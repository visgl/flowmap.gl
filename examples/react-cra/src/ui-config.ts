import GUI from 'lil-gui';
import {FlowMapLayer} from '@flowmap.gl/layers';
import {COLOR_SCHEMES} from '@flowmap.gl/data';

export const UI_INITIAL = {
  darkMode: true,
  colorScheme: 'Teal',
  highlightColor: '#ff9b29',
  fadeEnabled: FlowMapLayer.defaultProps.fadeEnabled,
  fadeOpacityEnabled: FlowMapLayer.defaultProps.fadeOpacityEnabled,
  fadeAmount: FlowMapLayer.defaultProps.fadeAmount,
  clusteringEnabled: FlowMapLayer.defaultProps.clusteringEnabled,
  clusteringAuto: FlowMapLayer.defaultProps.clusteringAuto,
  clusteringLevel: 5,
  animationEnabled: FlowMapLayer.defaultProps.animationEnabled,
  adaptiveScalesEnabled: FlowMapLayer.defaultProps.adaptiveScalesEnabled,
  locationTotalsEnabled: FlowMapLayer.defaultProps.locationTotalsEnabled,
};

export const UI_CONFIG = (gui: GUI) => {
  gui.add(UI_INITIAL, 'darkMode');
  gui.add(UI_INITIAL, 'colorScheme', Object.keys(COLOR_SCHEMES));
  gui.addColor(UI_INITIAL, 'highlightColor');
  gui.add(UI_INITIAL, 'animationEnabled');
  gui.add(UI_INITIAL, 'adaptiveScalesEnabled');
  gui.add(UI_INITIAL, 'locationTotalsEnabled');

  const fading = gui.addFolder('Fading');
  const fadeEnabled = fading.add(UI_INITIAL, 'fadeEnabled');
  const fadeOpacityEnabled = fading
    .add(UI_INITIAL, 'fadeOpacityEnabled')
    .enable(FlowMapLayer.defaultProps.fadeEnabled);
  const fadeAmount = fading
    .add(UI_INITIAL, 'fadeAmount')
    .min(0)
    .max(100)
    .enable(FlowMapLayer.defaultProps.fadeEnabled);
  fadeEnabled.onChange((v: boolean) => {
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
    .enable(!FlowMapLayer.defaultProps.clusteringAuto);
  clusteringEnabled.onChange((v: boolean) => {
    clusteringAuto.enable(v);
    clusteringLevel.enable(v);
  });
  clusteringAuto
    .enable(FlowMapLayer.defaultProps.clusteringEnabled)
    .onChange((v: boolean) => {
      clusteringLevel.enable(!v);
    });
};
