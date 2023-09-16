/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {FlowmapLayer} from '@flowmap.gl/layers';
import {COLOR_SCHEMES} from '@flowmap.gl/data';

export const UI_INITIAL = {
  darkMode: true,
  colorScheme: 'Teal',
  highlightColor: '#ff9b29',
  opacity: 1.0,
  fadeEnabled: FlowmapLayer.defaultProps.fadeEnabled,
  fadeOpacityEnabled: FlowmapLayer.defaultProps.fadeOpacityEnabled,
  fadeAmount: FlowmapLayer.defaultProps.fadeAmount,
  clusteringEnabled: FlowmapLayer.defaultProps.clusteringEnabled,
  clusteringAuto: FlowmapLayer.defaultProps.clusteringAuto,
  clusteringLevel: 5,
  clusteringMethod: 'HCA',
  animationEnabled: FlowmapLayer.defaultProps.animationEnabled,
  adaptiveScalesEnabled: FlowmapLayer.defaultProps.adaptiveScalesEnabled,
  locationsEnabled: FlowmapLayer.defaultProps.locationsEnabled,
  locationTotalsEnabled: FlowmapLayer.defaultProps.locationTotalsEnabled,
  locationLabelsEnabled: FlowmapLayer.defaultProps.locationLabelsEnabled,
  maxTopFlowsDisplayNum: FlowmapLayer.defaultProps.maxTopFlowsDisplayNum,
};

export const initLilGui = (gui) => {
  gui.add(UI_INITIAL, 'darkMode');
  gui.add(UI_INITIAL, 'colorScheme', Object.keys(COLOR_SCHEMES));
  gui.addColor(UI_INITIAL, 'highlightColor');
  gui.add(UI_INITIAL, 'animationEnabled');
  gui.add(UI_INITIAL, 'adaptiveScalesEnabled');
  gui.add(UI_INITIAL, 'locationsEnabled');
  gui.add(UI_INITIAL, 'locationTotalsEnabled');
  gui.add(UI_INITIAL, 'locationLabelsEnabled');

  gui
    .add(UI_INITIAL, 'maxTopFlowsDisplayNum')
    .min(0)
    .max(10000)
    .step(10)
    .enable(FlowmapLayer.defaultProps.maxTopFlowsDisplayNum);

  gui.add(UI_INITIAL, 'opacity', 0.0, 1.0);

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
  const clusteringMethod = clustering
    .add(UI_INITIAL, 'clusteringMethod', ['HCA', 'H3'])
    .enable(FlowmapLayer.defaultProps.clusteringEnabled);

  const clusteringAuto = clustering.add(UI_INITIAL, 'clusteringAuto');
  const clusteringLevel = clustering
    .add(UI_INITIAL, 'clusteringLevel')
    .min(0)
    .max(20)
    .step(1)
    .enable(!FlowmapLayer.defaultProps.clusteringAuto);
  clusteringEnabled.onChange((v) => {
    clusteringAuto.enable(v);
    clusteringMethod.enable(v);
    clusteringLevel.enable(v && !clusteringEnabled.object.clusteringAuto);
  });
  clusteringAuto
    .enable(FlowmapLayer.defaultProps.clusteringEnabled)
    .onChange((v) => {
      clusteringLevel.enable(!v);
    });
};
