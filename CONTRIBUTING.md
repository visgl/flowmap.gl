## Contributing to flowmap.gl

**Thanks for taking the time to contribute!**

PRs and bug reports are welcome, and we are actively looking for new contributors.

## Setting Up Dev Environment

The **main** branch is the active development branch.

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

If you consider opening a PR, here are some documentations to get you started:

- vis.gl [developer process](https://www.github.com/visgl/tsc/tree/master/developer-process)

### Maintainers

- [Ilya Boyandin](https://github.com/ilyabo)

## Code of Conduct

Please be mindful of and adhere to the Contributor Covenant's [Code of Conduct](CODE_OF_CONDUCT.md) when contributing to flowmap.gl.