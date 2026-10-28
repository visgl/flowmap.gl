# Flowmap.gl global flights example

This example shows how Flowmap.gl can be used in a React web app.

## Usage

```bash
npm i
npm run dev
```

To build a production version:

```bash
npm run build
```

## Globe prototype

From the repository root, run `yarn build` and then
`yarn workspace @flowmap.gl/react-app dev`.

- `/` loads 7,698 airports and 37,042 routes from the
  [Global Flights dataset](https://gist.github.com/ilyabo/15998ce470d8b4fe6ea5d94187adc89b),
  pinned to a snapshot. Both spherical and H3 clustering are available.
  It starts in globe mode with dark mode enabled. The right-hand Controls panel
  contains `globe`, `basemapLabels`, and the data-source link alongside the other
  settings. Turning `globe` off shows the same flights on the flat map and restores
  its last camera and selected rendering mode.
- `/globe.html` redirects to the main example, preserving query settings.
- Globe mode uses MapLibre's globe camera and gestures with an interleaved
  deck.gl overlay, following deck.gl's `global-grids` example. The basemap uses
  OpenFreeMap Dark or Positron vector tiles according to the dark-mode toggle,
  with labels and attribution. Drag rotates
  the globe; wheel/pinch and the zoom buttons change scale. Tilt is disabled.
  The flights example defaults to dark mode. Light mode uses Positron and a
  pale background around the globe.
  Basemap labels render above the flows; the `basemapLabels` checkbox shows
  or hides them in either theme, independently of airport/location labels.
- `/tests/globe.html` runs WebGL rendering/picking regression checks in the browser
  and prints `ALL CHECKS PASSED` when complete. It is not included in production builds.

Globe mode forces curved rendering with surface-following great-circle arrows.
Clustering uses a spherical hierarchy with weighted centers, so dateline and
polar neighbors cluster correctly. Automatic levels follow the globe's actual
scale; manual levels select the next available hierarchy level. Supplied
hierarchies (such as H3) retain their own centers and zoom convention. Flat-map
clustering retains the existing Mercator behavior. The Mercator corridor-offset
calculation is bypassed on the globe; curviness does not change great-circle routes. Hidden-side geometry is
clipped in both drawing and picking, without requiring an opaque globe beneath it.
Location circles lie on the surface and foreshorten near the horizon.

This prototype retains endpoint-based flow filtering (`any` / `both`), so a route
whose endpoints are both outside the visible viewport is omitted even if part of
its path crosses the screen. Exactly antipodal endpoints use a deterministic
fallback plane because their shortest route is ambiguous. Routes use 96 segments;
this is not adaptive tessellation. The examples cap globe zoom at 12, before
`GlobeView` switches to Mercator. Flat mode retains its existing deck.gl
controller and Carto basemap styles.
