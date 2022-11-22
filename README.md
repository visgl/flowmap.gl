# Flowmap.gl

<a href=https://flowmapblue.github.io/flowmap.gl/><img alt=flowmap-gl src=https://user-images.githubusercontent.com/351828/147912794-36eab3ce-7ce3-40d6-ad24-4a11c1bda924.jpg width=400></a>


[Flow map](https://en.wikipedia.org/wiki/Flow_map) drawing layer for [deck.gl](http://uber.github.io/deck.gl). Can be used for visualizing movement of people (e.g. migration) or objects between geographic locations. The layer is rendered in WebGL and can handle large numbers of flows with a relatively good rendering performance.

Try [Flowmap.blue](https://flowmap.blue/) for an easy way of publishing flow maps (no programming skills required).

Run the [LIVE EXAMPLE](https://flowmapblue.github.io/flowmap.gl/) or 
check the source code of the following examples:

 - [React example](./examples/react-app)
 - [React worker example](./examples/react-worker-app)
 - [Webpack pure JS example](./examples/webpack-app)
 - [Svelte example](./examples/svelte-app)



## Development

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




## Contributing to flowmap.gl

Thanks for taking the time to contribute! 

PRs and bug reports are welcome. 
Please be mindful of and adhere to the Contributor Covenant's [Code of Conduct](CODE_OF_CONDUCT.md) when contributing to flowmap.gl. Also, check out [vis.gl developer process](https://www.github.com/visgl/tsc/tree/master/developer-process).

## Maintainers

- [Ilya Boyandin](https://github.com/ilyabo)
