/// <reference types="vitest/config" />

import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vite';
import packageJson from './package.json';

const useBrowserMode = process.env.VITEST_BROWSER === '1';

export default defineConfig({
  test: {
    name: packageJson.name,
    environment: 'jsdom',
    // Process forks intermittently time out on Windows when package suites run
    // concurrently. Worker threads avoid that startup bottleneck.
    pool: 'threads',
    maxWorkers: 2,
    browser: useBrowserMode
      ? {
          enabled: true,
          provider: playwright({
            launchOptions: {
              args: ['--window-size=1280,720', '--window-position=100,100'],
            },
          }),
          instances: [
            {
              browser: 'chromium',
            },
          ],
        }
      : undefined,
  },
});
