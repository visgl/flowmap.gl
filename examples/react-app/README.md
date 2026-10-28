# Flowmap.gl example with Create React App

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

- `/` keeps the bike-trip example and adds a **Globe** switch. Switching back
  restores the flat view and the selected rendering mode.
- `/globe.html` starts a separate globe example with synthetic global routes,
  including bidirectional, polar, and dateline-crossing connections.
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
`GlobeView` switches to Mercator. Globe basemap land comes from Natural Earth,
using the same source as deck.gl's globe example.
