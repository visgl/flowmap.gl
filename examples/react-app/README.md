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
- Both projections use MapLibre's camera and gestures with an interleaved
  deck.gl overlay, following deck.gl's `global-grids` example. The basemap uses
  OpenFreeMap Dark or Positron vector tiles according to the dark-mode toggle,
  with labels and attribution. Drag rotates
  the map; wheel/pinch and the zoom buttons change scale. Tilt is disabled on the globe.
  The flights example defaults to dark mode. Light mode uses Positron and a
  pale background around the globe.
  Basemap labels render above the flows; the `basemapLabels` checkbox shows
  or hides them in both projections and themes, independently of airport/location labels.
- `/tests/globe.html` runs WebGL rendering/picking regression checks in the browser
  and prints `ALL CHECKS PASSED` when complete. It is not included in production builds.

Globe mode supports all flow rendering modes along surface-following great circles:
`straight` and `animated-straight` follow the great circle, and `curved` bows
overlapping corridors to the right of travel. See the `FlowmapLayer` API docs for
which layer draws each mode and the performance tradeoffs.
Clustering uses a spherical hierarchy with weighted centers, so dateline and
polar neighbors cluster correctly. Automatic levels follow the globe's actual
scale; manual levels select the next available hierarchy level. Supplied
hierarchies (such as H3) retain their own centers and zoom convention. Flat-map
clustering retains the existing Mercator behavior. Hidden-side geometry is
clipped in both drawing and picking, without requiring an opaque globe beneath it.
Location circles lie on the surface and foreshorten near the horizon.

Globe `any` filtering conservatively tests the great-circle arc, including routes
whose endpoints are both off-screen. `both` still requires both endpoints to be
visible. Globe location coordinates are cached across camera moves; no Mercator
index is built for globe visibility. Exactly antipodal endpoints use a deterministic
fallback plane because their shortest route is ambiguous. Routes use 96 segments;
this is not adaptive tessellation. The examples cap globe zoom at 12, before
`GlobeView` switches to Mercator. Flat mode retains its existing flow rendering modes
and Mercator clustering, with the same OpenFreeMap styles and label controls.

## Non-accumulating blending

The `blendingMode` control defaults to `non-accumulating`, using darken in
light mode or lighten in dark mode without intensifying identical overlaps.
Select `normal` to compare ordinary blending. The library default remains `normal`.
Fading remains separately selectable; opacity and antialiasing fade
RGB toward the neutral color. Neutral outlines do not separate crossing flows,
and per-channel comparisons can alter mixed hues.

`canvasRendering` selects `interleaved` or `separate`; `auto` preserves the
existing interleaved default for both projections. `dataset` switches between
the default global flights and the Bixi flat-map dataset. Bixi fits Montreal;
returning to flights restores the initial global cameras.

For a dense view, disable clustering and location circles. Try `Sunset` for
colored crossings, then toggle both themes, fading, opacity, and projection.
`/tests/blending.html` checks GPU pixels for twelve identical overlaps in both
themes, all flat render modes and globe, neutral and tinted backgrounds, opacity,
edge coverage, picking, visible highlights, and live mode/fade changes.
`/tests/globe.html?blendingMode=non-accumulating` runs the globe/clustering suite
with the new mode, including hidden-hemisphere picking and horizon clipping.
These test pages are served only by the development server.
