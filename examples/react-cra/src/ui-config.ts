import GUI from 'lil-gui';
import {FlowMapLayer} from '@flowmap.gl/layers';
import {COLOR_SCHEMES} from '@flowmap.gl/data';

export const UI_INITIAL = {
  darkMode: true,
  colorScheme: 'Teal',
  highlightColor: '#ff9b29',
  fadeEnabled: FlowMapLayer.defaultProps.fadeEnabled,
  fadeAmount: FlowMapLayer.defaultProps.fadeAmount,
  clusteringEnabled: FlowMapLayer.defaultProps.clusteringEnabled,
  clusteringAuto: FlowMapLayer.defaultProps.clusteringAuto,
  clusteringLevel: 5,
  animationEnabled: FlowMapLayer.defaultProps.animationEnabled,
  adaptiveScalesEnabled: FlowMapLayer.defaultProps.adaptiveScalesEnabled,
  locationTotalsEnabled: FlowMapLayer.defaultProps.locationTotalsEnabled,
};

export const UI_CONFIG = (gui: GUI) => {
  const colors = gui.addFolder('Colors');
  colors.add(UI_INITIAL, 'darkMode');
  colors.add(UI_INITIAL, 'colorScheme', Object.keys(COLOR_SCHEMES));
  colors.addColor(UI_INITIAL, 'highlightColor');
  const fadeEnabled = colors.add(UI_INITIAL, 'fadeEnabled');
  const fadeAmount = colors
    .add(UI_INITIAL, 'fadeAmount')
    .min(0)
    .max(100)
    .enable(FlowMapLayer.defaultProps.fadeEnabled);
  fadeEnabled.onChange((v: boolean) => {
    fadeAmount.enable(v);
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

  const other = gui.addFolder('Other');
  other.add(UI_INITIAL, 'animationEnabled');
  other.add(UI_INITIAL, 'adaptiveScalesEnabled');
  other.add(UI_INITIAL, 'locationTotalsEnabled');
};
