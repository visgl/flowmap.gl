# Change log

## [8.0.0-alpha.0] - 2021-12-20
### Changed
The library was significantly refactored:
- Introduced packages @flowmap.gl/data and @flowmap.gl/layers instead of core, cluster and react
- FlowMapLayer is now a stateful layer handing much of the interactivity like clustering, adaptive scales, hovering and also the animation. This way it's much easier now to take advantage of these features in different environments.   
