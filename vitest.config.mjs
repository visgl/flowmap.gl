import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vitest/config';
import {playwright} from '@vitest/browser-playwright';

const sourceAliases = ['data', 'layers'].map((name) => ({
  find: new RegExp(`^@flowmap\\.gl/${name}$`),
  replacement: fileURLToPath(
    new URL(`./packages/${name}/src/index.ts`, import.meta.url),
  ),
}));

export default defineConfig({
  test: {
    attachmentsDir: 'test-results/attachments',
    projects: [
      {
        resolve: {alias: sourceAliases},
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/node/**/*.test.js'],
        },
      },
      {
        resolve: {alias: sourceAliases},
        // Vitest reports console output for failed tests below.
        server: {forwardConsole: false},
        test: {
          name: 'browser',
          include: ['test/browser/**/*.test.js'],
          silent: 'passed-only',
          // Limit simultaneous WebGL contexts and GPU contention.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
          browser: {
            enabled: true,
            headless: true,
            screenshotDirectory: 'test-results/screenshots',
            screenshotFailures: true,
            viewport: {width: 1000, height: 800},
            provider: playwright({
              launchOptions: {
                args: [
                  '--use-angle=swiftshader',
                  '--enable-unsafe-swiftshader',
                ],
              },
              contextOptions: {deviceScaleFactor: 1},
            }),
            instances: [{browser: 'chromium'}],
          },
        },
      },
    ],
  },
});
