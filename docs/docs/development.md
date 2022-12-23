---
sidebar_position: 99
---

# Development

Building flowmap.gl locally from the source requires Node.js.
We use [yarn](https://yarnpkg.com/en/docs/install) to manage the dependencies.

```bash
# Install dependencies
yarn 

# Add your Mapbox token to .env (needed for background map)
cd examples/react-app
cp .env.example .env

# Start example app in dev mode
cd ../..
yarn start
```

