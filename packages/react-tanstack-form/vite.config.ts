/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import packageJson from './package.json';

export default defineConfig({
  test: {
    name: packageJson.name,
    environment: 'jsdom',
    pool: 'threads',
    maxWorkers: 1,
  },
});
