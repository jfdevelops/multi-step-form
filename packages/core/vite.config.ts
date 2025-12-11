/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import packageJson from './package.json';
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins:[tsconfigPaths()],
  test: {
    name: packageJson.name,
  },
});
