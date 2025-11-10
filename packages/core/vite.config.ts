/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      outDir: 'dist/types',
    }),
    tsconfigPaths()
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'JfDevelopsMultiStepForm',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
