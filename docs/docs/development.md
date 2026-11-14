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

