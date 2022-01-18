# Change log

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
