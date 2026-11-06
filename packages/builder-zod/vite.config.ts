/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import packageJson from './package.json';

export default defineConfig({
  test: {
    name: packageJson.name,
    pool: 'threads',
    maxWorkers: 2,
  },
});
