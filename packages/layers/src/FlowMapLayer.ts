import {CompositeLayer} from '@deck.gl/core';
import {
  Location,
  Flow,
  FlowMapState,
  LayersData,
  LocationFilterMode,
  FlowMapDataProvider,
  LocalFlowMapDataProvider,
  ViewportProps,
} from '@flowmap.gl/data';
import FlowLinesLayer from './FlowLinesLayer';
import FlowCirclesLayer from './FlowCirclesLayer';
import {LayerProps, PickingType} from './types';

export type Props = {
  locations: Location[];
  flows: Flow[];
} & LayerProps;

type State = {
  flowmapState: FlowMapState;
  dataProvider: FlowMapDataProvider;
  layersData: LayersData | undefined;
};

export default class FlowMapLayer extends CompositeLayer {
  state: State | undefined;

  constructor(props: Props) {
    super(props);
  }

  initializeState(context: {viewport: ViewportProps}): void {
    const {viewport} = context;
    const {locations, flows} = this.props;
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
    const dataProvider = new LocalFlowMapDataProvider(
      locations,
      flows,
      flowmapState,
    );
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

  renderLayers(): Array<any> {
    const layers = [];

    if (this.state?.layersData) {
      const {layersData} = this.state;
      const {circleAttributes, lineAttributes} = layersData;
      if (circleAttributes) {
        layers.push(
          new FlowLinesLayer(
            this.getSubLayerProps({
              id: 'lines',
              data: lineAttributes,
              opacity: 1,
              pickable: true,
              drawOutline: true,
              outlineColor: [0, 0, 0, 255],
            }),
          ),
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
              onHover: async (info: any) => {
                const startTime = Date.now(); // this must be before await
                // const location =
                //   info.index === -1
                //     ? undefined
                //     : await getLocationByIndex(info.index);
                // if (location) {
                //   // const totals = await getTotalsForLocation(
                //   //   getLocationId(location),
                //   // );
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
              },
            }),
          ),
        );
      }
    }

    return layers;
  }
}
