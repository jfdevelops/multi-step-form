/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MultiStepFormSharedUtils',
      fileName: 'multi-step-form-shared-utils',
    },
  },
  plugins: [dts()],
  test: {
    globals: true,
  },
});
