/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */
import {CompositeLayer} from '@deck.gl/core';
import {ScatterplotLayer, TextLayer} from '@deck.gl/layers';
import {
  FilterState,
  FlowLinesLayerAttributes,
  FlowmapAggregateAccessors,
  FlowmapData,
  FlowmapDataAccessors,
  FlowmapDataProvider,
  LayersData,
  LocalFlowmapDataProvider,
  ViewportProps,
  colorAsRgba,
  getFlowLineAttributesByIndex,
  getFlowmapColors,
  getLocationCoordsByIndex,
  getOuterCircleRadiusByIndex,
  isFlowmapData,
  isFlowmapDataProvider,
} from '@flowmap.gl/data';
import AnimatedFlowLinesLayer from './AnimatedFlowLinesLayer';
import FlowCirclesLayer from './FlowCirclesLayer';
import FlowLinesLayer from './FlowLinesLayer';
import {
  FlowmapLayerPickingInfo,
  LayerProps,
  PickingInfo,
  PickingType,
} from './types';

export type FlowmapLayerProps<
  L extends Record<string, any>,
  F extends Record<string, any>,
> = {
  data?: FlowmapData<L, F>;
  dataProvider?: FlowmapDataProvider<L, F>;
  filter?: FilterState;
  locationsEnabled?: boolean;
  locationTotalsEnabled?: boolean;
  locationLabelsEnabled?: boolean;
  adaptiveScalesEnabled?: boolean;
  animationEnabled?: boolean;
  clusteringEnabled?: boolean;
  clusteringLevel?: number;
  fadeEnabled?: boolean;
  fadeOpacityEnabled?: boolean;
  clusteringAuto?: boolean;
  darkMode?: boolean;
  fadeAmount?: number;
  colorScheme?: string | string[];
  highlightColor?: string | number[];
  maxTopFlowsDisplayNum?: number;
  onHover?: (
    info: FlowmapLayerPickingInfo<L, F> | undefined,
    event: SourceEvent,
  ) => void;
  onClick?: (info: FlowmapLayerPickingInfo<L, F>, event: SourceEvent) => void;
} & Partial<FlowmapDataAccessors<L, F>> &
  LayerProps;

const PROPS_TO_CAUSE_LAYER_DATA_UPDATE: string[] = [
  'filter',
  'locationsEnabled',
  'locationTotalsEnabled',
  'locationLabelsEnabled',
  'adaptiveScalesEnabled',
  'animationEnabled',
  'clusteringEnabled',
  'clusteringLevel',
  'fadeEnabled',
  'fadeOpacityEnabled',
  'clusteringAuto',
  'darkMode',
  'fadeAmount',
  'colorScheme',
  'highlightColor',
  'maxTopFlowsDisplayNum',
];

enum HighlightType {
  LOCATION = 'location',
  FLOW = 'flow',
}

type HighlightedLocationObject = {
  type: HighlightType.LOCATION;
  coords: [number, number];
  radius: number;
};

type HighlightedFlowObject = {
  type: HighlightType.FLOW;
  lineAttributes: FlowLinesLayerAttributes;
};

type HighlightedObject = HighlightedLocationObject | HighlightedFlowObject;

type State<L extends Record<string, any>, F extends Record<string, any>> = {
  accessors: FlowmapAggregateAccessors<L, F>;
  dataProvider: FlowmapDataProvider<L, F>;
  layersData: LayersData | undefined;
  highlightedObject: HighlightedObject | undefined;
  pickingInfo: FlowmapLayerPickingInfo<L, F> | undefined;
  lastHoverTime: number | undefined;
  lastClickTime: number | undefined;
};

export type SourceEvent = {srcEvent: MouseEvent};

export default class FlowmapLayer<
  L extends Record<string, any>,
  F extends Record<string, any>,
> extends CompositeLayer {
  static defaultProps = {
    darkMode: true,
    fadeAmount: 50,
    locationsEnabled: true,
    locationTotalsEnabled: true,
    locationLabelsEnabled: false,
    animationEnabled: false,
    clusteringEnabled: true,
    fadeEnabled: true,
    fadeOpacityEnabled: false,
    clusteringAuto: true,
    clusteringLevel: undefined,
    adaptiveScalesEnabled: true,
    colorScheme: 'Teal',
    highlightColor: 'orange',
    maxTopFlowsDisplayNum: 5000,
  };
  state: State<L, F> | undefined;

  public constructor(props: FlowmapLayerProps<L, F>) {
    super({
      ...props,
      onHover: (info: PickingInfo<any>, event: SourceEvent) => {
        const startTime = Date.now();
        this.setState({
          highlightedObject: this._getHighlightedObject(info),
          lastHoverTime: startTime,
        });

        const {onHover} = props;
        if (onHover) {
          this._getFlowmapLayerPickingInfo(info).then((info) => {
            if ((this.state?.lastHoverTime ?? 0) <= startTime) {
              this.setState({pickingInfo: info});
              onHover(info, event);
            } else {
              // Skipping, because this is not the latest hover event
            }
          });
        }
      },
      onClick: (info: PickingInfo<any>, event: SourceEvent) => {
        const {onClick} = props;
        const startTime = Date.now();
        this.setState({
          lastClickTime: startTime,
        });
        if (onClick) {
          this._getFlowmapLayerPickingInfo(info).then((info) => {
            if ((this.state?.lastClickTime ?? 0) <= startTime) {
              this.setState({pickingInfo: info});
              if (info) {
                onClick(info, event);
              }
            } else {
              // Skipping, because this is not the latest hover event
            }
          });
        }
      },
    });
  }

  initializeState() {
    this.state = {
      accessors: new FlowmapAggregateAccessors<L, F>(this.props),
      dataProvider: this._getOrMakeDataProvider(),
      layersData: undefined,
      highlightedObject: undefined,
      pickingInfo: undefined,
      lastHoverTime: undefined,
      lastClickTime: undefined,
    };
  }

  getPickingInfo({info}: Record<string, any>) {
    // This is for onHover event handlers set on the <DeckGL> component
    if (!info.object) {
      const object = this.state?.pickingInfo?.object;
      if (object) {
        return {
          ...info,
          object,
          picked: true,
        };
      }
    }
    return info;
  }

  // private _updateAccessors() {
  //   this.state?.dataProvider?.setAccessors(this.props);
  //   this.setState({accessors: new FlowmapAggregateAccessors(this.props)});
  // }

  private _getOrMakeDataProvider() {
    const {data, dataProvider} = this.props;
    if (isFlowmapDataProvider<L, F>(dataProvider)) {
      return dataProvider;
    } else if (isFlowmapData<L, F>(data)) {
      const dataProvider = new LocalFlowmapDataProvider<L, F>(this.props);
      dataProvider.setFlowmapData(data);
      return dataProvider;
    }
    throw new Error(
      'FlowmapLayer: data must be a FlowmapDataProvider or FlowmapData',
    );
  }

  private _updateDataProvider() {
    this.setState({dataProvider: this._getOrMakeDataProvider()});
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
    if (changeFlags.propsChanged) {
      // this._updateAccessors();
    }
    if (changeFlags.dataChanged) {
      this._updateDataProvider();
    }
    if (changeFlags.viewportChanged || changeFlags.dataChanged) {
      this.setState({highlightedObject: undefined});
    }

    if (
      changeFlags.viewportChanged ||
      changeFlags.dataChanged ||
      (changeFlags.propsChanged &&
        PROPS_TO_CAUSE_LAYER_DATA_UPDATE.some(
          (prop) => oldProps[prop] !== props[prop],
        ))
    ) {
      const {dataProvider} = this.state || {};
      if (dataProvider) {
        dataProvider.setFlowmapState(this._getFlowmapState());
        dataProvider.updateLayersData((layersData: LayersData | undefined) => {
          this.setState({layersData, highlightedObject: undefined});
        }, changeFlags);
      }
    }
  }

  private _getSettingsState() {
    const {
      locationsEnabled,
      locationTotalsEnabled,
      locationLabelsEnabled,
      adaptiveScalesEnabled,
      animationEnabled,
      clusteringEnabled,
      clusteringLevel,
      fadeEnabled,
      fadeOpacityEnabled,
      clusteringAuto,
      darkMode,
      fadeAmount,
      colorScheme,
      highlightColor,
      maxTopFlowsDisplayNum,
    } = this.props;
    return {
      locationsEnabled,
      locationTotalsEnabled,
      locationLabelsEnabled,
      adaptiveScalesEnabled,
      animationEnabled,
      clusteringEnabled,
      clusteringLevel,
      fadeEnabled,
      fadeOpacityEnabled,
      clusteringAuto,
      darkMode,
      fadeAmount,
      colorScheme,
      highlightColor,
      maxTopFlowsDisplayNum,
    };
  }

  private _getFlowmapState() {
    return {
      viewport: pickViewportProps(this.context.viewport),
      filter: this.props.filter,
      settings: this._getSettingsState(),
    };
  }

  private async _getFlowmapLayerPickingInfo(
    info: Record<string, any>,
  ): Promise<FlowmapLayerPickingInfo<L, F> | undefined> {
    const {index, sourceLayer} = info;
    const {dataProvider, accessors} = this.state || {};
    if (!dataProvider || !accessors) {
      return undefined;
    }
    const commonInfo = {
      ...info,
      picked: info.picked,
      layer: info.layer,
      index: info.index,
      x: info.x,
      y: info.y,
      coordinate: info.coordinate,
      event: info.event,
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
            object: {
              type: PickingType.FLOW,
              flow,
              origin: origin,
              dest: dest,
              count: accessors.getFlowMagnitude(flow),
            },
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
            object: {
              type: PickingType.LOCATION,
              location,
              id,
              name,
              totals,
              circleRadius: circleRadius,
            },
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
        let attrs = getFlowLineAttributesByIndex(lineAttributes, index);
        if (this.props.fadeOpacityEnabled) {
          attrs = {
            ...attrs,
            attributes: {
              ...attrs.attributes,
              getColor: {
                ...attrs.attributes.getColor,
                value: new Uint8Array([
                  ...attrs.attributes.getColor.value.slice(0, 3),
                  255, // the highlight color should be always opaque
                ]),
              },
            },
          };
        }
        return {
          type: HighlightType.FLOW,
          lineAttributes: attrs,
        };
      }
    } else if (sourceLayer instanceof FlowCirclesLayer) {
      const {circleAttributes} = this.state?.layersData || {};
      if (circleAttributes) {
        return {
          type: HighlightType.LOCATION,
          coords: getLocationCoordsByIndex(circleAttributes, index),
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
      const {circleAttributes, lineAttributes, locationLabels} =
        layersData || {};
      if (circleAttributes && lineAttributes) {
        const flowmapColors = getFlowmapColors(this._getSettingsState());
        const outlineColor = colorAsRgba(
          flowmapColors.outlineColor || (this.props.darkMode ? '#000' : '#fff'),
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
              emptyColor: this.props.darkMode
                ? [0, 0, 0, 255]
                : [255, 255, 255, 255],
              outlineEmptyMix: 0.4,
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
                    antialiasing: true,
                    stroked: true,
                    filled: false,
                    lineWidthUnits: 'pixels',
                    getLineWidth: 2,
                    radiusUnits: 'pixels',
                    getRadius: (d: HighlightedLocationObject) => d.radius,
                    getLineColor: colorAsRgba(this.props.highlightColor),
                    getPosition: (d: HighlightedLocationObject) => d.coords,
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
                    outlineColor: colorAsRgba(this.props.highlightColor),
                    outlineThickness: 1,
                    parameters: {
                      depthTest: false,
                    },
                  }),
                }),
              );
              break;
          }
        }
      }
      if (locationLabels) {
        layers.push(
          new TextLayer(
            this.getSubLayerProps({
              id: 'location-labels',
              data: locationLabels,
              maxWidth: 1000,
              pickable: false,
              fontFamily: 'Helvetica',
              getPixelOffset: (d: string, {index}: {index: number}) => {
                const r = getOuterCircleRadiusByIndex(circleAttributes, index);
                return [0, r + 5];
              },
              getPosition: (d: string, {index}: {index: number}) => {
                const pos = getLocationCoordsByIndex(circleAttributes, index);
                return pos;
              },
              getText: (d: string) => d,
              getSize: 10,
              getColor: [255, 255, 255, 255],
              getAngle: 0,
              getTextAnchor: 'middle',
              getAlignmentBaseline: 'top',
            }),
          ),
        );
      }
    }

    return layers;
  }
}

function pickViewportProps(viewport: Record<string, any>): ViewportProps {
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
