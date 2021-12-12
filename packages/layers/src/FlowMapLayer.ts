import {CompositeLayer} from '@deck.gl/core';
import {ScatterplotLayer} from '@deck.gl/layers';
import {
  colorAsRgba,
  FlowLinesLayerAttributes,
  FlowMapData,
  FlowMapDataProvider,
  getFlowLineAttributesByIndex,
  getFlowMapColors,
  getLocationCentroid,
  getLocationId,
  getOuterCircleRadiusByIndex,
  Highlight,
  HighlightType,
  isFlowMapData,
  isFlowMapDataProvider,
  LayersData,
  LocalFlowMapDataProvider,
  LocationFilterMode,
  ViewportProps,
} from '@flowmap.gl/data';
import FlowLinesLayer from './FlowLinesLayer';
import FlowCirclesLayer from './FlowCirclesLayer';
import {LayerProps} from './types';

export type FlowMapLayerProps = {
  data: FlowMapData | FlowMapDataProvider;
  locationTotalsEnabled?: boolean;
  adaptiveScalesEnabled?: boolean;
  animationEnabled?: boolean;
  clusteringEnabled?: boolean;
  manualClusterZoom?: number;
  fadeEnabled?: boolean;
  clusteringAuto?: boolean;
  darkMode?: boolean;
  fadeAmount?: number;
  colorSchemeKey?: string;
} & LayerProps;

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

type State = {
  dataProvider: FlowMapDataProvider | undefined;
  // flowmapState: FlowMapState | undefined;
  layersData: LayersData | undefined;
  highlightedObject: HighlightedObject | undefined;
};

export default class FlowMapLayer extends CompositeLayer {
  static defaultProps = {
    darkMode: true,
    fadeAmount: 50,
    locationTotalsEnabled: true,
    animationEnabled: false,
    clusteringEnabled: true,
    fadeEnabled: true,
    clusteringAuto: true,
    manualClusterZoom: undefined,
    adaptiveScalesEnabled: true,
    colorSchemeKey: 'Teal',
  };
  state: State | undefined;

  constructor(props: FlowMapLayerProps) {
    super({
      ...props,
      onHover: (info: any) => {
        const {onHover} = props;
        this._onHover(info, onHover as (info: Record<string, any>) => void);
      },
      onClick: (info: any) => {
        const {onClick} = props;
        this._onClick(info, onClick as (info: Record<string, any>) => void);
      },
    });
  }

  initializeState(context: {viewport: ViewportProps}): void {
    this._handleDataChange();
  }

  private _handleDataChange() {
    const {data} = this.props;
    let dataProvider = undefined;
    if (isFlowMapDataProvider(data)) {
      dataProvider = data;
    } else if (isFlowMapData(data)) {
      dataProvider = new LocalFlowMapDataProvider();
      dataProvider.setFlowMapData(data);
    }
    this.setState({
      dataProvider,
    });
  }

  // private dispatch(action: Action) {
  //   const {flowmapState} = this.state || {};
  //   if (flowmapState) {
  //     const nextFlowMapState = mainReducer(flowmapState, action);
  //     this.setState({
  //       flowmapState: nextFlowMapState,
  //     });
  //     this.state?.dataProvider?.setFlowMapState(nextFlowMapState);
  //   } else {
  //     console.warn(
  //       'FlowMapLayer: flowmapState is undefined, could not dispatch action',
  //       action,
  //     );
  //   }
  // }

  private handleHighlight(
    highlight: Highlight | undefined,
    highlightedObject?: HighlightedObject,
  ) {
    // this.dispatch({type: ActionType.SET_HIGHLIGHT, highlight});
    this.setState({highlightedObject});
  }

  // private _viewportChanged() {
  //   const {flowmapState, dataProvider} = this.state || {};
  //   if (!flowmapState || !dataProvider) {
  //     return false;
  //   }
  //
  //   const nextViewport = asViewState(this.context.viewport);
  //   return !deepEqual(nextViewport, asViewState(flowmapState.viewport));
  // }

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
    const {dataProvider} = this.state || {};
    if (!dataProvider) {
      return;
    }
    if (changeFlags.dataChanged) {
      this._handleDataChange();
    }

    // const viewportChanged = this._viewportChanged();
    // if (viewportChanged) {
    //   this.dispatch({
    //     type: ActionType.SET_VIEWPORT,
    //     viewport: asViewState(this.context.viewport),
    //   });
    // }
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
      manualClusterZoom,
      fadeEnabled,
      clusteringAuto,
      darkMode,
      fadeAmount,
      colorSchemeKey,
    } = this.props;
    return {
      locationTotalsEnabled,
      adaptiveScalesEnabled,
      animationEnabled,
      clusteringEnabled,
      manualClusterZoom,
      fadeEnabled,
      clusteringAuto,
      darkMode,
      fadeAmount,
      colorSchemeKey,
    };
  }

  private _getFlowMapState() {
    return {
      viewport: asViewState(this.context.viewport),
      // TODO: remove adjustViewportToLocations
      adjustViewportToLocations: true,
      filterState: {
        selectedLocations: undefined,
        locationFilterMode: LocationFilterMode.ALL,
        selectedTimeRange: undefined,
      },
      settingsState: this._getSettingsState(),
    };
  }

  // TODO: Maybe use for highlight  https://deck.gl/docs/api-reference/core/composite-layer#filtersublayer

  async _onHover(
    info: Record<string, any>,
    onHover: (info: Record<string, any>) => void,
  ): Promise<void> {
    const {index, sourceLayer} = info;
    const {dataProvider} = this.state || {};
    // if (lastHoverEventStartTimeRef > startTime) {
    //   // Skipping, because this is not the latest hover event
    //   return;
    // }
    if (sourceLayer instanceof FlowLinesLayer) {
      const flow =
        index === -1 ? undefined : await dataProvider?.getFlowByIndex(index);
      if (flow) {
        const {lineAttributes} = this.state?.layersData || {};
        const {origin, dest, count} = flow;
        this.handleHighlight(
          {
            type: HighlightType.FLOW,
            flow: {origin, dest, count},
          },
          lineAttributes
            ? {
                type: HighlightType.FLOW,
                lineAttributes: await getFlowLineAttributesByIndex(
                  lineAttributes,
                  info.index,
                ),
              }
            : undefined,
        );
      } else {
        this.handleHighlight(undefined);
      }
    } else if (sourceLayer instanceof FlowCirclesLayer) {
      const location =
        index === -1
          ? undefined
          : await dataProvider?.getLocationByIndex(index);

      if (location) {
        const {circleAttributes} = this.state?.layersData || {};
        this.handleHighlight(
          {
            type: HighlightType.LOCATION,
            locationId: getLocationId(location),
          },
          circleAttributes
            ? {
                type: HighlightType.LOCATION,
                centroid: getLocationCentroid(location),
                radius: getOuterCircleRadiusByIndex(
                  circleAttributes,
                  info.index,
                ),
              }
            : undefined,
        );
      } else {
        this.handleHighlight(undefined);
      }
    }

    if (typeof onHover === 'function') {
      onHover(info);
    }
  }

  _onClick(
    info: Record<string, any>,
    onClick: (info: Record<string, any>) => void,
  ): void {
    if (typeof onClick === 'function') {
      onClick(info);
    }
  }

  renderLayers(): Array<any> {
    const layers = [];

    if (this.state?.layersData) {
      const {layersData, highlightedObject} = this.state;
      const {circleAttributes, lineAttributes} = layersData;
      if (circleAttributes && lineAttributes) {
        const flowMapColors = getFlowMapColors(this._getSettingsState());
        const outlineColor = colorAsRgba(
          flowMapColors.outlineColor || (this.props.darkMode ? '#000' : '#fff'),
        );
        layers.push(
          new FlowLinesLayer({
            ...this.getSubLayerProps({
              id: 'lines',
              data: lineAttributes,
              opacity: 1,
              pickable: true,
              drawOutline: true,
              outlineColor: outlineColor,
              parameters: {
                // prevent z-fighting at non-zero bearing/pitch
                depthTest: false,
              },
            }),
          }),
        );
        layers.push(
          new FlowCirclesLayer(
            this.getSubLayerProps({
              id: 'circles',
              data: circleAttributes,
              opacity: 1,
              pickable: true,
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

// type DeckGLLayer = any;

// function getLayerKind(id: string): LayerKind {
//   const kind = id.substr(id.lastIndexOf(LAYER_ID_SEPARATOR) + LAYER_ID_SEPARATOR.length);
//   return LayerKind[kind as keyof typeof LayerKind];
// }

// function getPickType({ id }: DeckGLLayer): PickingType | undefined {
//   switch (getLayerKind(id)) {
//     case LayerKind.FLOWS:
//     case LayerKind.FLOWS_HIGHLIGHTED:
//       return PickingType.FLOW;
//     case LayerKind.LOCATIONS:
//     case LayerKind.LOCATIONS_HIGHLIGHTED:
//       return PickingType.LOCATION;
//     case LayerKind.LOCATION_AREAS:
//       return PickingType.LOCATION_AREA;
//     default:
//       return undefined;
//   }
// }

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
