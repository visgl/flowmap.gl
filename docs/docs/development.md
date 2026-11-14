---
sidebar_position: 99
---

# Development

Building flowmap.gl locally from the source requires Node.js 22 or newer and pnpm 10.34.9.
We use [pnpm](https://pnpm.io/installation) to manage the dependencies.

```bash
# Install dependencies
pnpm install

# Add your Mapbox token to .env (needed for background map)
cd examples/react-app
cp .env.example .env

# Start example app in dev mode
cd ../..
pnpm start
```

## Tests

Install Chromium once after installing dependencies (and again when Playwright is
updated):

```bash
pnpm exec playwright install chromium
pnpm test
```

The suites can also be run separately:

- `pnpm test:imports` builds the packages and runs the native Node.js ESM import
  and shared React smoke tests against the installed workspace packages.
- `pnpm test:node` runs those smoke tests followed by the clustering regression
  tests in Vitest's Node environment.
- `pnpm test:browser` runs the rendering tests in Vitest Browser Mode using
  Playwright's headless Chromium and SwiftShader WebGL rendering.

Vitest tests import package sources so they can run without rebuilding and respond
to source edits in watch mode. The native smoke tests continue to exercise the
built packages with Node's own module resolver.

```bash
# Watch both Vitest projects
pnpm test:watch

# Watch a single rendering suite in a visible browser
pnpm exec vitest --project browser test/browser/antimeridian.test.js --browser.headless=false

# Filter by test name
pnpm test:browser -t 'repeated worlds'
```

Rendering tests retain framebuffer comparisons, picking checks, and live layer
updates. Each test creates and finalizes its own Deck instance; animated pixel
checks freeze `Date.now` while allowing real animation frames to continue. The
globe checks run with both normal and non-accumulating blending. Browser files run
sequentially to limit WebGL resource contention.

CI runs Node tests on Node.js 22 and 24 and rendering tests on Linux with Chromium.
Failure screenshots are written to `test-results/` and uploaded as CI artifacts.
