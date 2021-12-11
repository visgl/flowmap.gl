import {CompositeLayer} from '@deck.gl/core';
import {
  FlowMapState,
  LayersData,
  LocationFilterMode,
  FlowMapDataProvider,
  LocalFlowMapDataProvider,
  ViewportProps,
  FlowMapData,
  isFlowMapData,
} from '@flowmap.gl/data';
import FlowLinesLayer from './FlowLinesLayer';
import FlowCirclesLayer from './FlowCirclesLayer';
import {LayerProps, PickingType} from './types';
import {isFlowMapDataProvider} from '@flowmap.gl/data';

export type Props = {
  data: FlowMapData | FlowMapDataProvider;
} & LayerProps;

type State = {
  dataProvider: FlowMapDataProvider | undefined;
  flowmapState: FlowMapState | undefined;
  layersData: LayersData | undefined;
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
    const {viewport} = context;
    const {data} = this.props;
    const flowmapState = {
      viewport,
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

  shouldUpdateState(params: Record<string, any>): boolean {
    // return super.shouldUpdateState(params);
    return true;
    // TODO: be smarter on when to update
    // (e.g. ignore viewport changes when adaptiveScalesEnabled and clustering are false)
  }

  updateState({oldProps, props, changeFlags}: Record<string, any>): void {
    if (this.state?.flowmapState && this.state?.dataProvider) {
      const nextState = {
        ...this.state.flowmapState,
        viewport: this.context.viewport,
      };
      const {dataProvider} = this.state;
      dataProvider.setFlowMapState(nextState);

      (async () => {
        const layersData = await dataProvider.getLayersData();
        this.setState({
          flowMapState: nextState,
          layersData,
        });
      })();
    }
  }

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
    if (sourceLayer instanceof FlowLinesLayer) {
      // TODO
    } else if (sourceLayer instanceof FlowCirclesLayer) {
      const location =
        index === -1
          ? undefined
          : await dataProvider?.getLocationByIndex(index);

      console.log(location);
    }

    // const startTime = Date.now(); // this must be before await
    // const {index} = info;
    // console.log(location);

    // if (location) {
    // const totals = await getTotalsForLocation(
    //   getLocationId(location),
    // );
    //   this.handleHover(
    //     {
    //       ...info,
    //       object: location,
    //       type: PickingType.LOCATION,
    //       // circleRadius: getOuterCircleRadiusByIndex(
    //       //   circleAttributes,
    //       //   info.index,
    //       // ),
    //       // totalIn: totals?.incoming,
    //       // totalOut: totals?.outgoing,
    //       // totalWithin: totals?.within,
    //     },
    //     startTime,
    //   );
    // } else {
    //   this.handleHover(
    //     {
    //       ...info,
    //       type: PickingType.LOCATION,
    //       object: undefined,
    //     },
    //     startTime,
    //   );
    // }

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
      const {layersData} = this.state;
      const {circleAttributes, lineAttributes} = layersData;
      if (circleAttributes) {
        layers.push(
          new FlowLinesLayer({
            ...this.getSubLayerProps({
              id: 'lines',
              data: lineAttributes,
              opacity: 1,
              pickable: true,
              drawOutline: true,
              outlineColor: [0, 0, 0, 255],
              parameters: {
                // prevent z-fighting at non-zero bearing/pitch
                depthTest: false,
              },
            }),
          }),
        );
      }
      if (lineAttributes) {
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
