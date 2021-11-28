import {Flow, LocationFilterMode, ViewportProps} from './types';

export const MAX_ZOOM_LEVEL = 20;
export const MIN_ZOOM_LEVEL = 0;
export const MIN_PITCH = 0;
export const MAX_PITCH = +60;

export function mapTransition(): any {
  return {
    transitionDuration: 0,
    // transitionInterpolator: new FlyToInterpolator(),
    // transitionEasing: easeCubic,
    transitionInterpolator: undefined,
    transitionEasing: undefined,
  };
}
export enum HighlightType {
  LOCATION = 'location',
  FLOW = 'flow',
}

export interface LocationHighlight {
  type: HighlightType.LOCATION;
  locationId: string;
}

export interface FlowHighlight {
  type: HighlightType.FLOW;
  flow: Flow;
}

export type Highlight = LocationHighlight | FlowHighlight;

export interface FilterState {
  selectedLocations: string[] | undefined;
  selectedTimeRange: [Date, Date] | undefined;
  locationFilterMode: LocationFilterMode;
}

export interface SettingsState {
  animationEnabled: boolean;
  fadeEnabled: boolean;
  locationTotalsEnabled: boolean;
  adaptiveScalesEnabled: boolean;
  clusteringEnabled: boolean;
  clusteringAuto: boolean;
  manualClusterZoom?: number;
  darkMode: boolean;
  fadeAmount: number;
  colorSchemeKey: string | undefined;
  // TODO: move out basemap settings as changes in them
  //       shouldn't cause recalculating layers data
  baseMapEnabled: boolean;
  baseMapOpacity: number;
}

export interface FlowMapState {
  filterState: FilterState;
  settingsState: SettingsState;
  viewport: ViewportProps;
  adjustViewportToLocations: boolean;
  highlight?: Highlight;
}

export enum ActionType {
  SET_VIEWPORT = 'SET_VIEWPORT',
  ZOOM_IN = 'ZOOM_IN',
  ZOOM_OUT = 'ZOOM_OUT',
  RESET_BEARING_PITCH = 'RESET_BEARING_PITCH',
  SET_HIGHLIGHT = 'SET_HIGHLIGHT',
  CLEAR_SELECTION = 'CLEAR_SELECTION',
  SELECT_LOCATION = 'SELECT_LOCATION',
  SET_SELECTED_LOCATIONS = 'SET_SELECTED_LOCATIONS',
  SET_LOCATION_FILTER_MODE = 'SET_LOCATION_FILTER_MODE',
  SET_TIME_RANGE = 'SET_TIME_RANGE',
  SET_CLUSTERING_ENABLED = 'SET_CLUSTERING_ENABLED',
  SET_CLUSTERING_AUTO = 'SET_CLUSTERING_AUTO',
  SET_MANUAL_CLUSTER_ZOOM = 'SET_MANUAL_CLUSTER_ZOOM',
  SET_ANIMATION_ENABLED = 'SET_ANIMATION_ENABLED',
  SET_LOCATION_TOTALS_ENABLED = 'SET_LOCATION_TOTALS_ENABLED',
  SET_ADAPTIVE_SCALES_ENABLED = 'SET_ADAPTIVE_SCALES_ENABLED',
  SET_DARK_MODE = 'SET_DARK_MODE',
  SET_FADE_ENABLED = 'SET_FADE_ENABLED',
  SET_BASE_MAP_ENABLED = 'SET_BASE_MAP_ENABLED',
  SET_FADE_AMOUNT = 'SET_FADE_AMOUNT',
  SET_BASE_MAP_OPACITY = 'SET_BASE_MAP_OPACITY',
  SET_COLOR_SCHEME = 'SET_COLOR_SCHEME',
}

export type Action =
  | {
      type: ActionType.SET_VIEWPORT;
      viewport: ViewportProps;
      adjustViewportToLocations?: boolean;
    }
  | {
      type: ActionType.ZOOM_IN;
    }
  | {
      type: ActionType.ZOOM_OUT;
    }
  | {
      type: ActionType.RESET_BEARING_PITCH;
    }
  | {
      type: ActionType.SET_HIGHLIGHT;
      highlight: Highlight | undefined;
    }
  | {
      type: ActionType.CLEAR_SELECTION;
    }
  | {
      type: ActionType.SELECT_LOCATION;
      locationId: string;
      incremental: boolean;
    }
  | {
      type: ActionType.SET_SELECTED_LOCATIONS;
      selectedLocations: string[] | undefined;
    }
  | {
      type: ActionType.SET_LOCATION_FILTER_MODE;
      mode: LocationFilterMode;
    }
  | {
      type: ActionType.SET_TIME_RANGE;
      range: [Date, Date];
    }
  | {
      type: ActionType.SET_CLUSTERING_ENABLED;
      clusteringEnabled: boolean;
    }
  | {
      type: ActionType.SET_CLUSTERING_AUTO;
      clusteringAuto: boolean;
    }
  | {
      type: ActionType.SET_ANIMATION_ENABLED;
      animationEnabled: boolean;
    }
  | {
      type: ActionType.SET_LOCATION_TOTALS_ENABLED;
      locationTotalsEnabled: boolean;
    }
  | {
      type: ActionType.SET_ADAPTIVE_SCALES_ENABLED;
      adaptiveScalesEnabled: boolean;
    }
  | {
      type: ActionType.SET_DARK_MODE;
      darkMode: boolean;
    }
  | {
      type: ActionType.SET_FADE_ENABLED;
      fadeEnabled: boolean;
    }
  | {
      type: ActionType.SET_BASE_MAP_ENABLED;
      baseMapEnabled: boolean;
    }
  | {
      type: ActionType.SET_FADE_AMOUNT;
      fadeAmount: number;
    }
  | {
      type: ActionType.SET_BASE_MAP_OPACITY;
      baseMapOpacity: number;
    }
  | {
      type: ActionType.SET_MANUAL_CLUSTER_ZOOM;
      manualClusterZoom: number | undefined;
    }
  | {
      type: ActionType.SET_COLOR_SCHEME;
      colorSchemeKey: string;
    };

export function mainReducer(state: FlowMapState, action: Action): FlowMapState {
  switch (action.type) {
    case ActionType.SET_VIEWPORT: {
      const {viewport, adjustViewportToLocations} = action;
      return {
        ...state,
        viewport: {
          ...viewport,
          zoom: Math.min(
            MAX_ZOOM_LEVEL,
            Math.max(MIN_ZOOM_LEVEL, viewport.zoom),
          ),
          ...mapTransition(),
        },
        highlight: undefined,
        ...(adjustViewportToLocations != null && {
          adjustViewportToLocations: false,
        }),
      };
    }
    case ActionType.ZOOM_IN: {
      const {viewport} = state;
      return {
        ...state,
        viewport: {
          ...viewport,
          zoom: Math.min(MAX_ZOOM_LEVEL, viewport.zoom * 1.1),
          ...mapTransition(),
        },
        highlight: undefined,
      };
    }
    case ActionType.ZOOM_OUT: {
      const {viewport} = state;
      return {
        ...state,
        viewport: {
          ...viewport,
          zoom: Math.max(MIN_ZOOM_LEVEL, viewport.zoom / 1.1),
          ...mapTransition(),
        },
        highlight: undefined,
      };
    }
    case ActionType.RESET_BEARING_PITCH: {
      const {viewport} = state;
      return {
        ...state,
        viewport: {
          ...viewport,
          bearing: 0,
          pitch: 0,
          ...mapTransition(),
        },
      };
    }
    case ActionType.SET_HIGHLIGHT: {
      const {highlight} = action;
      return {
        ...state,
        highlight,
      };
    }
    case ActionType.CLEAR_SELECTION: {
      return {
        ...state,
        filterState: {
          ...state.filterState,
          selectedLocations: undefined,
          locationFilterMode: LocationFilterMode.ALL,
        },
        highlight: undefined,
      };
    }
    case ActionType.SET_SELECTED_LOCATIONS: {
      const {selectedLocations} = action;
      const isEmpty = !selectedLocations || selectedLocations.length === 0;
      if (isEmpty) {
        return {
          ...state,
          filterState: {
            ...state.filterState,
            selectedLocations: undefined,
            locationFilterMode: LocationFilterMode.ALL,
          },
        };
      }
      return {
        ...state,
        filterState: {
          ...state.filterState,
          selectedLocations,
        },
      };
    }
    case ActionType.SET_LOCATION_FILTER_MODE: {
      const {mode} = action;
      return {
        ...state,
        filterState: {
          ...state.filterState,
          locationFilterMode: mode,
        },
      };
    }
    case ActionType.SET_TIME_RANGE: {
      const {range} = action;
      return {
        ...state,
        filterState: {
          ...state.filterState,
          selectedTimeRange: range,
        },
      };
    }
    case ActionType.SELECT_LOCATION: {
      const {selectedLocations} = state.filterState;
      const {locationId, incremental} = action;
      let nextSelectedLocations;
      if (selectedLocations) {
        const idx = selectedLocations.findIndex((id) => id === locationId);
        if (idx >= 0) {
          nextSelectedLocations = selectedLocations.slice();
          nextSelectedLocations.splice(idx, 1);
          if (nextSelectedLocations.length === 0)
            nextSelectedLocations = undefined;
        } else {
          if (incremental) {
            nextSelectedLocations = [...selectedLocations, locationId];
          } else {
            nextSelectedLocations = [locationId];
          }
        }
      } else {
        nextSelectedLocations = [locationId];
      }
      return {
        ...state,
        filterState: {
          ...state.filterState,
          selectedLocations: nextSelectedLocations,
        },
        ...(!nextSelectedLocations && {
          locationFilterMode: LocationFilterMode.ALL,
        }),
        highlight: undefined,
      };
    }
    case ActionType.SET_CLUSTERING_ENABLED: {
      const {clusteringEnabled} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          clusteringEnabled,
        },
      };
    }
    case ActionType.SET_CLUSTERING_AUTO: {
      const {clusteringAuto} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          clusteringAuto,
        },
      };
    }
    case ActionType.SET_ANIMATION_ENABLED: {
      const {animationEnabled} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          animationEnabled,
        },
      };
    }
    case ActionType.SET_LOCATION_TOTALS_ENABLED: {
      const {locationTotalsEnabled} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          locationTotalsEnabled,
        },
      };
    }
    case ActionType.SET_ADAPTIVE_SCALES_ENABLED: {
      const {adaptiveScalesEnabled} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          adaptiveScalesEnabled,
        },
      };
    }
    case ActionType.SET_DARK_MODE: {
      const {darkMode} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          darkMode,
        },
      };
    }
    case ActionType.SET_FADE_ENABLED: {
      const {fadeEnabled} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          fadeEnabled,
        },
      };
    }
    case ActionType.SET_BASE_MAP_ENABLED: {
      const {baseMapEnabled} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          baseMapEnabled,
        },
      };
    }
    case ActionType.SET_FADE_AMOUNT: {
      const {fadeAmount} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          fadeAmount,
        },
      };
    }
    case ActionType.SET_BASE_MAP_OPACITY: {
      const {baseMapOpacity} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          baseMapOpacity,
        },
      };
    }
    case ActionType.SET_MANUAL_CLUSTER_ZOOM: {
      const {manualClusterZoom} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          manualClusterZoom,
        },
      };
    }
    case ActionType.SET_COLOR_SCHEME: {
      const {colorSchemeKey} = action;
      return {
        ...state,
        settingsState: {
          ...state.settingsState,
          colorSchemeKey,
        },
      };
    }
  }
  return state;
}

export const reducer /*: Reducer<State, Action>*/ = (
  state: FlowMapState,
  action: Action,
) => {
  return mainReducer(state, action);
  // console.log(action.type, action);
};
