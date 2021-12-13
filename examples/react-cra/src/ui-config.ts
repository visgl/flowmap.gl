import GUI, {Controller} from 'lil-gui';
import {FlowMapLayer} from '@flowmap.gl/layers';
import {COLOR_SCHEMES} from '@flowmap.gl/data';

export const UI_INITIAL = {
  darkMode: true,
  colorScheme: 'Teal',
  fadeEnabled: FlowMapLayer.defaultProps.fadeEnabled,
  fadeAmount: FlowMapLayer.defaultProps.fadeAmount,
  clusteringEnabled: FlowMapLayer.defaultProps.clusteringEnabled,
  clusteringAuto: FlowMapLayer.defaultProps.clusteringAuto,
  clusteringLevel: 5,
  animationEnabled: FlowMapLayer.defaultProps.animationEnabled,
  adaptiveScalesEnabled: FlowMapLayer.defaultProps.adaptiveScalesEnabled,
  locationTotalsEnabled: FlowMapLayer.defaultProps.locationTotalsEnabled,
};

export const UI_CONFIG = {
  fadeEnabled: (c: Controller, gui: GUI) =>
    c.onChange((v: boolean) => {
      gui.controllers.find((c) => c._name === 'fadeAmount')?.enable(v);
    }),
  fadeAmount: (c: Controller) =>
    c.min(0).max(100).enable(FlowMapLayer.defaultProps.fadeEnabled),
  clusteringEnabled: (c: Controller, gui: GUI) =>
    c.onChange((v: boolean) => {
      gui.controllers.find((c) => c._name === 'clusteringAuto')?.enable(v);
      gui.controllers.find((c) => c._name === 'clusteringLevel')?.enable(v);
    }),
  clusteringAuto: (c: Controller, gui: GUI) =>
    c
      .enable(FlowMapLayer.defaultProps.clusteringEnabled)
      .onChange((v: boolean) => {
        gui.controllers.find((c) => c._name === 'clusteringLevel')?.enable(!v);
      }),
  clusteringLevel: (c: Controller) =>
    c.min(0).max(20).step(1).enable(!FlowMapLayer.defaultProps.clusteringAuto),
  colorScheme: [Object.keys(COLOR_SCHEMES)],
};
