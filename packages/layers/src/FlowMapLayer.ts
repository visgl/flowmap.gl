/*
 * Copyright 2022 FlowmapBlue
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import {CompositeLayer} from '@deck.gl/core';
import {ScatterplotLayer} from '@deck.gl/layers';
import {
  colorAsRgba,
  FlowLinesLayerAttributes,
  FlowMapData,
  FlowMapDataAccessors,
  FlowMapDataProvider,
  getFlowLineAttributesByIndex,
  getFlowMapColors,
  getOuterCircleRadiusByIndex,
  getLocationCentroidByIndex,
  isFlowMapData,
  isFlowMapDataProvider,
  LayersData,
  LocalFlowMapDataProvider,
  LocationFilterMode,
  ViewportProps,
  FlowMapAggregateAccessors,
  ClusterNode,
  AggregateFlow,
} from '@flowmap.gl/data';
import AnimatedFlowLinesLayer from './AnimatedFlowLinesLayer';
import FlowCirclesLayer from './FlowCirclesLayer';
import FlowLinesLayer from './FlowLinesLayer';
import {
  FlowLayerPickingInfo,
  LayerProps,
  PickingInfo,
  PickingType,
} from './types';

export type FlowMapLayerProps<L, F> = {
  data: FlowMapData<L, F> | FlowMapDataProvider<L, F>;
  locationTotalsEnabled?: boolean;
  adaptiveScalesEnabled?: boolean;
  animationEnabled?: boolean;
  clusteringEnabled?: boolean;
  clusteringLevel?: number;
  fadeEnabled?: boolean;
  clusteringAuto?: boolean;
  darkMode?: boolean;
  fadeAmount?: number;
  colorScheme?: string;
  onHover?: (
    info: FlowLayerPickingInfo<L, F> | undefined,
    event: SourceEvent,
  ) => void;
  onClick?: (info: FlowLayerPickingInfo<L, F>, event: SourceEvent) => void;
} & Partial<FlowMapDataAccessors<L, F>> &
  LayerProps;

enum HighlightType {
  LOCATION = 'location',
  FLOW = 'flow',
}

type HighlightedLocationObject = {
  type: HighlightType.LOCATION;
  centroid: [number, number];
  radius: number;
};

type HighlightedFlowObject = {
  type: HighlightType.FLOW;
  lineAttributes: FlowLinesLayerAttributes;
};

type HighlightedObject = HighlightedLocationObject | HighlightedFlowObject;

type State<L, F> = {
  accessors: FlowMapAggregateAccessors<L, F>;
  dataProvider: FlowMapDataProvider<L, F>;
  layersData: LayersData | undefined;
  highlightedObject: HighlightedObject | undefined;
};

export type SourceEvent = {srcEvent: MouseEvent};

export default class FlowMapLayer<L, F> extends CompositeLayer {
  static defaultProps = {
    darkMode: true,
    fadeAmount: 50,
    locationTotalsEnabled: true,
    animationEnabled: false,
    clusteringEnabled: true,
    fadeEnabled: true,
    clusteringAuto: true,
    clusteringLevel: undefined,
    adaptiveScalesEnabled: true,
    colorScheme: 'Teal',
  };
  state: State<L, F> | undefined;

  public constructor(props: FlowMapLayerProps<L, F>) {
    super({
      ...props,
      onHover: (info: PickingInfo<any>, event: SourceEvent) => {
        // TODO: if (lastHoverEventStartTimeRef > startTime) {
        //   // Skipping, because this is not the latest hover event
        //   return;
        // }
        this.setState({highlightedObject: this._getHighlightedObject(info)});
        const {onHover} = props;
        if (onHover) {
          this._getFlowLayerPickingInfo(info).then((info) =>
            onHover(info, event),
          );
        }
      },
      onClick: (info: PickingInfo<any>, event: SourceEvent) => {
        const {onClick} = props;
        if (onClick) {
          this._getFlowLayerPickingInfo(info).then((info) => {
            if (info) {
              onClick(info, event);
            }
          });
        }
      },
    });
  }

  initializeState() {
    this.state = {
      accessors: new FlowMapAggregateAccessors<L, F>(this.props),
      dataProvider: this._makeDataProvider(),
      layersData: undefined,
      highlightedObject: undefined,
    };
  }

  private _updateAccessors() {
    this.state?.dataProvider?.setAccessors(this.props);
    this.setState({accessors: new FlowMapAggregateAccessors(this.props)});
  }

  private _makeDataProvider() {
    const {data} = this.props;
    if (isFlowMapDataProvider<L, F>(data)) {
      return data;
    } else if (isFlowMapData<L, F>(data)) {
      const dataProvider = new LocalFlowMapDataProvider<L, F>(this.props);
      dataProvider.setFlowMapData(data);
      return dataProvider;
    }
    throw new Error(
      'FlowMapLayer: data must be a FlowMapDataProvider or FlowMapData',
    );
  }

  private _updateDataProvider() {
    this.setState({dataProvider: this._makeDataProvider()});
  }

  shouldUpdateState(params: Record<string, any>): boolean {
    const {changeFlags} = params;
    // if (this._viewportChanged()) {
    //   return true;
    // }
    if (changeFlags.viewportChanged) {
      return true;
    }
    return super.shouldUpdateState(params);
    // TODO: be smarter on when to update
    // (e.g. ignore viewport changes when adaptiveScalesEnabled and clustering are false)
  }

  updateState({oldProps, props, changeFlags}: Record<string, any>): void {
    const {dataProvider, highlightedObject} = this.state || {};
    if (!dataProvider) {
      return;
    }

    if (changeFlags.propsChanged) {
      this._updateAccessors();
    }
    if (changeFlags.dataChanged) {
      this._updateDataProvider();
    }
    if (changeFlags.viewportChanged || changeFlags.dataChanged) {
      this.setState({
        highlightedObject: undefined,
      });
    }

    if (changeFlags.viewportChanged || changeFlags.propsOrDataChanged) {
      dataProvider.setFlowMapState(this._getFlowMapState());
      (async () => {
        const layersData = await dataProvider.getLayersData();
        this.setState({layersData});
      })();
    }
  }

  private _getSettingsState() {
    const {
      locationTotalsEnabled,
      adaptiveScalesEnabled,
      animationEnabled,
      clusteringEnabled,
      clusteringLevel,
      fadeEnabled,
      clusteringAuto,
      darkMode,
      fadeAmount,
      colorScheme,
    } = this.props;
    return {
      locationTotalsEnabled,
      adaptiveScalesEnabled,
      animationEnabled,
      clusteringEnabled,
      clusteringLevel,
      fadeEnabled,
      clusteringAuto,
      darkMode,
      fadeAmount,
      colorScheme,
    };
  }

  private _getFlowMapState() {
    return {
      viewport: asViewState(this.context.viewport),
      filterState: {
        selectedLocations: undefined,
        locationFilterMode: LocationFilterMode.ALL,
        selectedTimeRange: undefined,
      },
      settingsState: this._getSettingsState(),
    };
  }

  private async _getFlowLayerPickingInfo(
    info: Record<string, any>,
  ): Promise<FlowLayerPickingInfo<L, F> | undefined> {
    const {index, sourceLayer} = info;
    const {dataProvider, accessors} = this.state || {};
    if (!dataProvider || !accessors) {
      return undefined;
    }
    const commonInfo = {
      // ...info,
      layer: info.layer,
      index: info.index,
      x: info.x,
      y: info.y,
      coordinate: info.coordinate,
    };
    if (
      sourceLayer instanceof FlowLinesLayer ||
      sourceLayer instanceof AnimatedFlowLinesLayer
    ) {
      const flow =
        index === -1 ? undefined : await dataProvider.getFlowByIndex(index);
      if (flow) {
        const origin = await dataProvider.getLocationById(
          accessors.getFlowOriginId(flow),
        );
        const dest = await dataProvider.getLocationById(
          accessors.getFlowDestId(flow),
        );
        if (origin && dest) {
          return {
            ...commonInfo,
            type: PickingType.FLOW,
            object: flow,
            origin: origin,
            dest: dest,
            count: accessors.getFlowMagnitude(flow),
          };
        }
      }
    } else if (sourceLayer instanceof FlowCirclesLayer) {
      const location =
        index === -1 ? undefined : await dataProvider.getLocationByIndex(index);

      if (location) {
        const id = accessors.getLocationId(location);
        const name = accessors.getLocationName(location);
        const totals = await dataProvider.getTotalsForLocation(id);
        const {circleAttributes} = this.state?.layersData || {};
        if (totals && circleAttributes) {
          const circleRadius = getOuterCircleRadiusByIndex(
            circleAttributes,
            info.index,
          );
          return {
            ...commonInfo,
            type: PickingType.LOCATION,
            object: location,
            id,
            name,
            totals,
            circleRadius: circleRadius,
            event: undefined,
          };
        }
      }
    }

    return undefined;
  }

  private _getHighlightedObject(
    info: Record<string, any>,
  ): HighlightedObject | undefined {
    const {index, sourceLayer} = info;
    if (index < 0) return undefined;
    if (
      sourceLayer instanceof FlowLinesLayer ||
      sourceLayer instanceof AnimatedFlowLinesLayer
    ) {
      const {lineAttributes} = this.state?.layersData || {};
      if (lineAttributes) {
        return {
          type: HighlightType.FLOW,
          lineAttributes: getFlowLineAttributesByIndex(lineAttributes, index),
        };
      }
    } else if (sourceLayer instanceof FlowCirclesLayer) {
      const {circleAttributes} = this.state?.layersData || {};
      if (circleAttributes) {
        return {
          type: HighlightType.LOCATION,
          centroid: getLocationCentroidByIndex(circleAttributes, index),
          radius: getOuterCircleRadiusByIndex(circleAttributes, index),
        };
      }
    }
    return undefined;
  }

  renderLayers(): Array<any> {
    const layers = [];
    if (this.state?.layersData) {
      const {layersData, highlightedObject} = this.state;
      const {circleAttributes, lineAttributes} = layersData || {};
      if (circleAttributes && lineAttributes) {
        const flowMapColors = getFlowMapColors(this._getSettingsState());
        const outlineColor = colorAsRgba(
          flowMapColors.outlineColor || (this.props.darkMode ? '#000' : '#fff'),
        );
        const commonLineLayerProps = {
          data: lineAttributes,
          parameters: {
            ...this.props.parameters,
            // prevent z-fighting at non-zero bearing/pitch
            depthTest: false,
          },
        };
        if (this.props.animationEnabled) {
          layers.push(
            // @ts-ignore
            new AnimatedFlowLinesLayer({
              ...this.getSubLayerProps({
                ...commonLineLayerProps,
                id: 'animated-flow-lines',
                drawOutline: false,
                thicknessUnit: 20,
              }),
            }),
          );
        } else {
          layers.push(
            new FlowLinesLayer({
              ...this.getSubLayerProps({
                ...commonLineLayerProps,
                id: 'flow-lines',
                drawOutline: true,
                outlineColor: outlineColor,
              }),
            }),
          );
        }
        layers.push(
          new FlowCirclesLayer(
            this.getSubLayerProps({
              id: 'circles',
              data: circleAttributes,
              emptyColor: [0, 0, 0, 255],
              emptyOutlineColor: [0, 0, 0, 255],
            }),
          ),
        );
        if (highlightedObject) {
          switch (highlightedObject.type) {
            case HighlightType.LOCATION:
              layers.push(
                new ScatterplotLayer({
                  ...this.getSubLayerProps({
                    id: 'location-highlight',
                    data: [highlightedObject],
                    pickable: false,
                    stroked: true,
                    filled: false,
                    lineWidthUnits: 'pixels',
                    getLineWidth: 2,
                    radiusUnits: 'pixels',
                    getRadius: (d: HighlightedLocationObject) => d.radius,
                    getLineColor: (d: HighlightedLocationObject) =>
                      colorAsRgba('orange'),
                    getPosition: (d: HighlightedLocationObject) => d.centroid,
                  }),
                }),
              );
              break;
            case HighlightType.FLOW:
              layers.push(
                new FlowLinesLayer({
                  ...this.getSubLayerProps({
                    id: 'flow-highlight',
                    data: highlightedObject.lineAttributes,
                    drawOutline: true,
                    pickable: false,
                    outlineColor: colorAsRgba('orange'),
                    outlineThickness: 1,
                  }),
                }),
              );
              break;
          }
        }
      }
    }

    return layers;
  }
}

function asViewState(viewport: Record<string, any>): ViewportProps {
  const {width, height, longitude, latitude, zoom, pitch, bearing} = viewport;
  return {
    width,
    height,
    longitude,
    latitude,
    zoom,
    pitch,
    bearing,
  };
}
