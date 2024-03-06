# Change log

## [8.0.2] - 2024-03-06

- Fix: getLocationIdsInViewport didn't use location id accessor

## [8.0.1] - 2023-10-09

- Publishing first release

## [8.0.0-alpha.27] - 2023-10-02

### Changed

- Upgraded kdbush to the new version with more efficient typed arrays storage
- Added "type": "module" to published packages
- Fix StackBlitz example

## [8.0.0-alpha.26] - 2023-09-17

### Changed

- Added locationsEnabled setting: location circles won't be rendered at all when set to false
- Fixed issue clustering with multiple same-coords locations
- Better treatment of duplicate locations
- Upgraded deps
- Replacing CRA with vite for examples

## [8.0.0-alpha.24] - 2022-05-29

### Changed

- Avoid unnecessary calls to getLayerData
- Upgraded deps

## [8.0.0-alpha.23] - 2022-03-17

### Changed

- Exposing getAggregateAccessors in FlowmapSelectors
- Exposing in LocalFlowmapDataProvider: getClusterZoom, getClusterIndex, getLocationsById, getLocationTotals, getFlowsForFlowmapLayer

## [8.0.0-alpha.22] - 2022-03-17

### Changed

- filterState and some of its props made optional
- Renamed settingsState -> settings, filterState -> filter
- Clustering will skip levels with same number of clusters and treat th…
- Extract addClusterNames
- Exposing selectors from LocalFlowmapDataProvider
- Adding missing updateLayersData to WorkerFlowmapDataProvider
- Adding locationLabelsEnabled prop (experimental)

## [8.0.0-alpha.21] - 2022-02-15

### Changed

- Fixed drawing issue in AnimatedFlowLineLayer when zooming beyond 12
- Location id type can be number or string

## [8.0.0-alpha.20] - 2022-02-15

### Changed

- Added clusterLevels to FlowmapData to enable custom clustering methods
- Added h3 clustering method to react-app example
- Fixed stale dataProvider in updateState issue
- Clustering will skip levels with same number of clusters and treat the case when multiple locations share the same coords
- Renamed settingsState -> settings, filterState -> filter
- FlowmapState.filter state made optional

## [8.0.0-alpha.19] - 2022-01-29

### Changed

- Introduced dataProvider.updateLayersData to give the data provider control over when/how often layersData is updated which leads to the flowmap being redrawn.

## [8.0.0-alpha.18] - 2022-01-24

### Changed

- Fixed: opacity didn't apply to arrow outline

## [8.0.0-alpha.17] - 2022-01-21

### Changed

- Removed ES5 build
- Removed workers package, moved the code to react-worker-app example
- Fixed arrow drawing issue (one of the triangles was being drawn twice)
- Fixed circle outline opacity issue

## [8.0.0-alpha.16] - 2022-01-19

### Changed

- Added ES5 build
- Relaxed D3 dependency versions (so that older pre-ESM versions of D3 still work)

## [8.0.0-alpha.15] - 2022-01-18

### Changed

- FlowmapLayer accepts locations and flows as Iterables

## [8.0.0-alpha.12] - 2022-01-12

### Changed

- Hover info object changed

## [8.0.0-alpha.11] - 2022-01-12

### Changed

- Hover info will include picked prop

## [8.0.0-alpha.10] - 2022-01-11

### Changed

- Added getPickingInfo to FlowmapLayer for onHover set on DeckGL component to work

## [8.0.0-alpha.9] - 2022-01-08

### Changed

- getLocationCentroid -> getLocationLat/Lon

## [8.0.0-alpha.8] - 2022-01-06

### Changed

- `colorScheme` prop can now be an array of colors
- `highlightColor` prop can now be an RGBA color

## [8.0.0-alpha.7] - 2022-01-03

### Changed

- Enforcing antialiasing for location circle highlight
- Removed dependency on @mapbox/geo-viewport

### Added

- Added Svelte example

## [8.0.0-alpha.6] - 2021-12-28

### Added

- Added WorkerFlowmapDataProvider

## [8.0.0-alpha.5] - 2021-12-23

### Added

- maxTopFlowsDisplayNum prop
- Added Pure-js example

### Changed

- Renamed FlowMapLayer -> FlowmapLayer

## [8.0.0-alpha.4] - 2021-12-23

### Perf

- Improving perf of prepareLayersData: replace flatMap with generators to avoid unnecessary intermediary arrays creation

## [8.0.0-alpha.3] - 2021-12-22

### Added

- Added fadeOpacityEnabled prop to FlowmapLayer

## [8.0.0-alpha.2] - 2021-12-22

### Fixed

- Sublayer props applied to highlight layers too

## [8.0.0-alpha.1] - 2021-12-22

### Fixed

- Prevent unnecessary calls to prepareLayerData
- Clear highlight on viewport change
- FlowmapLayer.parameters when passing to sublayers

## [8.0.0-alpha.0] - 2021-12-20

### Changed

The library was significantly refactored:

- Introduced packages @flowmap.gl/data and @flowmap.gl/layers instead of core, cluster and react
- FlowmapLayer is now a stateful layer handing much of the interactivity like clustering, adaptive scales, hovering and also the animation. This way it's much easier now to take advantage of these features in different environments.
