# Change log

## [9.5.0] - 2026-11-15

- Add experimental globe support with great-circle flows and spherical clustering
  on deck.gl's `GlobeView`. It relies on deck.gl's experimental `_GlobeViewport`
  export and internal globe radius, so it may need updates with deck.gl releases.
- Add experimental `blendingMode: 'non-accumulating'` to prevent overlapping flows
  from becoming progressively darker or brighter. Explicit depth `parameters`
  override its depth defaults.
- Add interleaved rendering to the React example, sharing the MapLibre canvas so
  flows blend directly against the basemap. Allow switching between interleaved
  rendering and a separate flow canvas.
- Filter overlapping location labels on the GPU, prioritizing larger location
  circles. Add `locationLabelProps` and the exported `LocationLabelProps` type for
  custom text, typography, outlines, backgrounds, and collision settings.
- Require deck.gl and luma.gl `^9.4.0` for `@flowmap.gl/layers`.
  Add `@deck.gl/extensions` `^9.4.1` as a peer dependency for label collision filtering.
- Fix native Node.js ESM imports in both published packages.
- Add opt-in `wrapLongitude` support to draw flat-map flows along the shortest
  route across the antimeridian, including curved and animated flows.
- Preserve flow magnitude order when wrapping longitude, so larger flows remain
  above smaller flows when rendering and picking overlapping arrows.
- Keep flow widths proportional to magnitude when clamping straight-flow endpoint
  offsets, and preserve curved arrowhead proportions when zooming out.
- Fix picking for opposite animated flows.
- Prevent cluster flicker caused by rounding noise near integer zoom levels.
- Fix disappearing flow layers when panning across repeated flat-map worlds.
- Retain globe routes whose bow or arrowhead enters the viewport, using a
  conservative displacement bound shared with worker data providers. Document
  surface-distance globe pulse spacing and its foreshortening near the horizon.
- Support all flow line rendering modes on deck.gl `GlobeView`: `'straight'` and
  `'animated-straight'` follow great circles, and `'curved'` bows routes along the
  surface with `flowLineCurviness`. Add a `numSegments` prop to
  `AnimatedFlowLinesLayer`.
- Make curved flow bends stable and route-length based on flat maps and globes,
  independent of location IDs, flow ordering, and neighboring routes. Longer
  routes bow farther, with smooth zoom transitions and a bounded maximum.
- Add optional `FlowmapLayer.viewId` for independent per-view data and rendering.
  Without it, flat-only multi-view drawing is unchanged; setups containing a globe
  draw an unbound flowmap only in the first view. Missing bound views hide the layer
  without throwing. Use separate bound layers for mixed globe/flat displays.
- Add a flights example with globe and flat-map views, move example zoom controls
  and the legend to the left corners, and include the React demo at `/demo/` in
  documentation deployments.
- Fix vanilla and Svelte example startup and React worker example controls and
  data-provider updates. Add browser smoke tests for these examples.
- Migrate development dependency management to pnpm and rendering regression tests
  to Vitest Browser Mode. Update dependencies across examples and documentation.
- Exclude build logs and development configuration from published package tarballs.

## [9.1.0] - 2026-04-13

- Curved flow line layer

## [9.0.0] - 2026-04-11

- Upgrade to deck.gl v9
- Improve arrow outline rendering (no need anymore to draw every arrow twice)

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
