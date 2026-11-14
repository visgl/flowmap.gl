# Website

This website is built using [Docusaurus](https://docusaurus.io/).
The documentation and React example remain separate apps, but Netlify deploys
them together, with the example at `/demo/`.

### Installation

```
$ pnpm install
```

### Local Development

```
$ pnpm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

This serves only the docs. Run `pnpm dev` from the repository root to develop the
React example separately. To test the docs' `/demo/` links, use the combined build
below.

### Build

```
$ pnpm build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Combined docs and demo build

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build:site
pnpm --dir docs serve
```

`build:site` builds the workspace libraries and React example, installs the docs'
locked dependencies and builds the docs, then copies the example's output into
`docs/build/demo/`. Serve `docs/build` to preview both apps at the same origin.
The example keeps its relative asset paths so it also works as a standalone build.

### Netlify deployment

Netlify is the deployment target for this repository. The `flowmapgl` project
serves `https://flowmap.gl/`.

Both Netlify configuration files run `pnpm build:site` from the repository root
and publish `docs/build`. Deploy Previews therefore include documentation and a
demo built from the same commit. Demo links use normal anchors to `/demo/` so they
stay on the current preview and load the separate app.
