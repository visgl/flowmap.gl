import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {fileURLToPath, URL} from 'node:url';
import {setTimeout} from 'node:timers/promises';
import process from 'node:process';
import {chromium} from 'playwright';
import {createServer, preview} from 'vite';

let browser;
before(async () => {
  browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
});
after(async () => browser?.close());

const locations =
  'id,name,lat,lon\na,West,45.50,-73.60\nb,East,45.52,-73.56\nc,North,45.54,-73.59';
const flows = 'origin,dest,count\na,b,100\nb,c,80\nc,a,60';

async function waitForFlows(page, selector, visible = true) {
  // Read the actual flow canvas during a frame: a basemap or an empty Deck
  // canvas must not make a broken example pass.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const colored = await page.evaluate(
      (selector) =>
        new Promise((resolve) => {
          globalThis.requestAnimationFrame(() => {
            const canvas = globalThis.document.querySelector(selector);
            const gl = canvas?.getContext('webgl2');
            if (!gl) return resolve(null);
            const pixels = new Uint8Array(canvas.width * canvas.height * 4);
            gl.readPixels(
              0,
              0,
              canvas.width,
              canvas.height,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels,
            );
            let colored = 0;
            for (let i = 0; i < pixels.length; i += 4) {
              if (
                pixels[i] !== pixels[i + 1] ||
                pixels[i + 1] !== pixels[i + 2]
              )
                colored++;
            }
            resolve(colored);
          });
        }),
      selector,
    );
    if (colored !== null && (visible ? colored > 100 : colored === 0)) return;
    await setTimeout(50);
  }
  assert.fail(
    `Expected ${visible ? 'visible flows' : 'an empty flow canvas'} in ${selector}`,
  );
}

function control(page, name) {
  return page
    .locator('.lil-controller')
    .filter({has: page.getByText(name, {exact: true})});
}

for (const [example, dev] of [
  ['vite-app', false],
  ['svelte-app', false],
  ['react-worker-app', false],
  ['react-worker-app', true],
]) {
  test(
    `${example} renders flows and survives interaction (${dev ? 'dev' : 'production'})`,
    {timeout: 90_000},
    async (t) => {
      const root = fileURLToPath(
        new URL(`../../examples/${example}`, import.meta.url),
      );
      // Vite preview defaults NODE_ENV to production in this process.
      process.env.NODE_ENV = dev ? 'development' : 'production';
      const server = dev
        ? await createServer({root, server: {host: '127.0.0.1', port: 0}})
        : await preview({
            root,
            configFile: false,
            build: {outDir: example === 'svelte-app' ? 'public' : 'dist'},
            preview: {host: '127.0.0.1', port: 0},
          });
      let context;
      t.after(async () => {
        await context?.close();
        if (dev) await server.close();
        else await new Promise((resolve) => server.httpServer.close(resolve));
      });
      if (dev) await server.listen();

      context = await browser.newContext({
        viewport: {width: 1000, height: 800},
      });
      // Mock remote data and basemaps for deterministic, offline CI. Context
      // routing also covers CSV requests made inside the data worker.
      await context.route('https://**/*', async (route) => {
        const url = new URL(route.request().url());
        if (
          url.pathname.endsWith('/locations.csv') ||
          url.pathname.endsWith('/flows.csv')
        ) {
          await route.fulfill({
            contentType: 'text/csv',
            body: url.pathname.endsWith('/locations.csv') ? locations : flows,
          });
        } else {
          await route.fulfill({json: {version: 8, sources: {}, layers: []}});
        }
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(server.resolvedUrls.local[0]);
      const canvas =
        example === 'react-worker-app' ? '#deckgl-overlay' : '#deck-canvas';
      await waitForFlows(page, canvas);
      assert.equal(
        await page.locator('canvas').count(),
        2,
        'Both Deck and MapLibre must initialize',
      );

      // Picking and camera changes both trigger asynchronous worker updates.
      await page.mouse.move(400, 400);
      await page.mouse.wheel(0, -150);
      await waitForFlows(page, canvas);

      if (example !== 'svelte-app') {
        await control(page, 'darkMode').locator('input').uncheck();
        await waitForFlows(page, canvas);
        assert.equal(
          await page.locator(canvas).evaluate((el) => el.style.mixBlendMode),
          'darken',
        );
        for (const mode of ['curved', 'animated-straight', 'straight']) {
          await control(page, 'flowLinesRenderingMode')
            .locator('select')
            .selectOption(mode);
          await waitForFlows(page, canvas);
        }
        await control(page, 'clusteringMethod')
          .locator('select')
          .selectOption('H3');
        await waitForFlows(page, canvas);
        await control(page, 'locationsEnabled').locator('input').uncheck();
        await control(page, 'maxTopFlowsDisplayNum').locator('input').fill('0');
        await control(page, 'maxTopFlowsDisplayNum')
          .locator('input')
          .press('Enter');
        await waitForFlows(page, canvas, false);
        await control(page, 'maxTopFlowsDisplayNum')
          .locator('input')
          .fill('5000');
        await control(page, 'maxTopFlowsDisplayNum')
          .locator('input')
          .press('Enter');
        await waitForFlows(page, canvas);
        await control(page, 'blendingMode')
          .locator('select')
          .selectOption('normal');
        await waitForFlows(page, canvas);
      }
      assert.deepEqual(errors, []);
    },
  );
}
