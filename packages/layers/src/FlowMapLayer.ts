import {CompositeLayer} from '@deck.gl/core';
import {ScatterplotLayer} from '@deck.gl/layers';
import {
  FlowMapState,
  LayersData,
  LocationFilterMode,
  FlowMapDataProvider,
  LocalFlowMapDataProvider,
  ViewportProps,
  FlowMapData,
  isFlowMapData,
  Action,
  mainReducer,
  HighlightType,
  getLocationId,
  Highlight,
  ActionType,
  FlowLinesLayerAttributes,
  getOuterCircleRadiusByIndex,
  getLocationCentroid,
  colorAsRgba,
  getFlowMapColors,
  getFlowLineAttributesByIndex,
} from '@flowmap.gl/data';
import FlowLinesLayer from './FlowLinesLayer';
import FlowCirclesLayer from './FlowCirclesLayer';
import {LayerProps, PickingType} from './types';
import {isFlowMapDataProvider} from '@flowmap.gl/data';
import deepEqual from 'fast-deep-equal';

export type Props = {
  data: FlowMapData | FlowMapDataProvider;
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
  flowmapState: FlowMapState | undefined;
  layersData: LayersData | undefined;
  highlightedObject: HighlightedObject | undefined;
};

export default class FlowMapLayer extends CompositeLayer {
  state: State | undefined;

  constructor(props: Props) {
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
    const {data} = this.props;
    const flowmapState = {
      viewport: asViewState(context.viewport),
      // TODO: remove adjustViewportToLocations
      adjustViewportToLocations: true,
      filterState: {
        selectedLocations: undefined,
        locationFilterMode: LocationFilterMode.ALL,
        selectedTimeRange: undefined,
      },
      settingsState: {
        locationTotalsEnabled: true,
        baseMapEnabled: true,
        adaptiveScalesEnabled: true,
        animationEnabled: false,
        clusteringEnabled: true,
        manualClusterZoom: undefined,
        fadeEnabled: true,
        clusteringAuto: true,
        darkMode: true,
        fadeAmount: 50,
        baseMapOpacity: 50,
        colorSchemeKey: 'Teal',
      },
    };
    let dataProvider = undefined;
    if (isFlowMapDataProvider(data)) {
      dataProvider = data;
    } else if (isFlowMapData(data)) {
      dataProvider = new LocalFlowMapDataProvider(data, flowmapState);
    }
    this.setState({
      dataProvider,
      flowmapState,
    });
  }

  private dispatch(action: Action) {
    const {flowmapState} = this.state || {};
    if (flowmapState) {
      const nextFlowMapState = mainReducer(flowmapState, action);
      this.setState({
        flowmapState: nextFlowMapState,
      });
      this.state?.dataProvider?.setFlowMapState(nextFlowMapState);
    } else {
      console.warn(
        'FlowMapLayer: flowmapState is undefined, could not dispatch action',
        action,
      );
    }
  }

  private handleHighlight(
    highlight: Highlight | undefined,
    highlightedObject?: HighlightedObject,
  ) {
    this.dispatch({type: ActionType.SET_HIGHLIGHT, highlight});
    this.setState({highlightedObject});
  }

  private _viewportChanged() {
    const {flowmapState, dataProvider} = this.state || {};
    if (!flowmapState || !dataProvider) {
      return false;
    }

    const nextViewport = asViewState(this.context.viewport);
    return !deepEqual(nextViewport, asViewState(flowmapState.viewport));
  }

  shouldUpdateState(params: Record<string, any>): boolean {
    if (this._viewportChanged()) {
      return true;
    }

    return super.shouldUpdateState(params);
    // TODO: be smarter on when to update
    // (e.g. ignore viewport changes when adaptiveScalesEnabled and clustering are false)
  }

  updateState({oldProps, props, changeFlags}: Record<string, any>): void {
    console.log('updateState');
    const {dataProvider} = this.state || {};
    if (!dataProvider) {
      return;
    }

    const viewportChanged = this._viewportChanged();
    if (viewportChanged) {
      this.dispatch({
        type: ActionType.SET_VIEWPORT,
        viewport: asViewState(this.context.viewport),
      });
    }
    if (viewportChanged || changeFlags.dataChanged) {
      // dataProvider.setFlowMapState(nextState);

      (async () => {
        console.log('updateState: getLayersData');
        const layersData = await dataProvider.getLayersData();
        this.setState({layersData});
      })();
    }
  }

  // TODO: Use for highlight  https://deck.gl/docs/api-reference/core/composite-layer#filtersublayer

  getPickingInfo(params: Record<string, any>): Record<string, any> {
    const {info, sourceLayer} = params;

    // const type = getPickType(params.sourceLayer);
    // if (!type) {
    //   return params.info;
    // }

    // const info = {
    //   ...params.info,
    //   type,
    // };

    // const { selectors } = this.state;
    // if (type === PickingType.FLOW) {
    //   const getLocationById = selectors.getLocationByIdGetter(this.props);
    //   const { getFlowOriginId, getFlowDestId } = selectors.getInputAccessors();
    //   const flow = info.object as Flow;
    //   return {
    //     ...info,
    //     ...(flow && {
    //       origin: getLocationById(getFlowOriginId(flow)),
    //       dest: getLocationById(getFlowDestId(flow)),
    //     }),
    //   };
    // }

    // if (type === PickingType.LOCATION || type === PickingType.LOCATION_AREA) {
    //   const location: Location = type === PickingType.LOCATION ? info.object && info.object.location : info.object;
    //   const getLocationTotalIn = selectors.getLocationTotalInGetter(this.props);
    //   const getLocationTotalOut = selectors.getLocationTotalOutGetter(this.props);
    //   const getLocationTotalWithin = selectors.getLocationTotalWithinGetter(this.props);
    //   const getLocationCircleRadius = selectors.getLocationCircleRadiusGetter(this.props);

    //   return {
    //     ...info,
    //     ...(location && {
    //       object: location,
    //       totalIn: getLocationTotalIn(location),
    //       totalOut: getLocationTotalOut(location),
    //       totalWithin: getLocationTotalWithin(location),
    //       circleRadius: getLocationCircleRadius({ location, type: LocationCircleType.OUTER }),
    //     }),
    //   };
    // }

    return info;
  }

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
    console.log('renderLayers');
    const layers = [];

    if (this.state?.layersData) {
      const {layersData, highlightedObject, flowmapState} = this.state;
      const {settingsState} = flowmapState || {};
      const {circleAttributes, lineAttributes} = layersData;
      if (circleAttributes && lineAttributes && settingsState) {
        const flowMapColors = getFlowMapColors(settingsState);
        const outlineColor = colorAsRgba(
          flowMapColors.outlineColor ||
            (settingsState.darkMode ? '#000' : '#fff'),
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
