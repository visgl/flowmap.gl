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
  isFlowMapData,
  isFlowMapDataProvider,
  isLocationClusterNode,
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
  onHover?: (info: FlowLayerPickingInfo<L, F> | undefined) => void;
  onClick?: (info: FlowLayerPickingInfo<L, F>) => void;
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
      __onHover: props.onHover,
      __onClick: props.onClick,
      onHover: async (info: PickingInfo<any>) => {
        await this._onHover(info);
      },
      onClick: async (
        info: PickingInfo<any>,
        event: {srcEvent: MouseEvent},
      ) => {
        // const location =
        //   info.index === -1
        //     ? undefined
        //     : await this.dataProvider.getLocationByIndex(info.index);
        //
        // const {onHover} = props;
        // if (typeof onHover === 'function') {
        //   onHover({
        //     ...info,
        //     object: location,
        //     event: event.srcEvent,
        //   });
        // }
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

  private _updateHighlight(
    pickingInfo:
      | FlowLayerPickingInfo<L | ClusterNode, F | AggregateFlow>
      | undefined,
    highlightedObject?: HighlightedObject,
  ) {
    this.setState({highlightedObject});
    const {__onHover} = this.props;
    if (typeof __onHover === 'function') {
      __onHover(pickingInfo);
    }
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

    if (changeFlags.viewportChanged) {
      if (highlightedObject) {
        this._updateHighlight(undefined, undefined);
      }
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

  private async _onHover(info: Record<string, any>): Promise<void> {
    const {index, sourceLayer} = info;
    const {dataProvider, accessors} = this.state || {};
    if (!dataProvider || !accessors) {
      return;
    }
    // TODO: if (lastHoverEventStartTimeRef > startTime) {
    //   // Skipping, because this is not the latest hover event
    //   return;
    // }

    const commonInfo = {
      // ...info,
      layer: info.layer,
      index: info.index,
      x: info.x,
      y: info.y,
      coordinate: info.coordinate,
    };

    let pickingInfo: FlowLayerPickingInfo<L, F> | undefined = undefined;
    let highlightedObject: HighlightedObject | undefined = undefined;
    if (
      sourceLayer instanceof FlowLinesLayer ||
      sourceLayer instanceof AnimatedFlowLinesLayer
    ) {
      const flow =
        index === -1 ? undefined : await dataProvider.getFlowByIndex(index);
      if (flow) {
        const {lineAttributes} = this.state?.layersData || {};
        const origin = await dataProvider.getLocationById(
          accessors.getFlowOriginId(flow),
        );
        const dest = await dataProvider.getLocationById(
          accessors.getFlowDestId(flow),
        );
        if (origin && dest) {
          pickingInfo = {
            ...commonInfo,
            type: PickingType.FLOW,
            object: flow,
            origin: origin,
            dest: dest,
            count: accessors.getFlowMagnitude(flow),
          };
          if (lineAttributes) {
            highlightedObject = {
              type: HighlightType.FLOW,
              lineAttributes: await getFlowLineAttributesByIndex(
                lineAttributes,
                info.index,
              ),
            };
          }
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
          pickingInfo = {
            ...commonInfo,
            type: PickingType.LOCATION,
            object: location,
            id,
            name,
            totals,
            circleRadius: circleRadius,
            event: undefined,
          };
          highlightedObject = {
            type: HighlightType.LOCATION,
            centroid: accessors.getLocationCentroid(location),
            radius: circleRadius,
          };
        }
      }
    }
    this._updateHighlight(pickingInfo, highlightedObject);
  }

  handleClick(info: Record<string, any>): void {
    console.log('_onClick', info);
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
                  id: 'location-highlight',
                  data: [highlightedObject],
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
              );
              break;
            case HighlightType.FLOW:
              layers.push(
                new FlowLinesLayer({
                  id: 'flow-highlight',
                  data: highlightedObject.lineAttributes,
                  drawOutline: true,
                  outlineColor: colorAsRgba('orange'),
                  outlineThickness: 1,
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
