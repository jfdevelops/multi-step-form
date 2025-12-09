/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    dts({
      include: ['src'],
      entryRoot: 'src',
    }),
    tsconfigPaths(),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        _internals: resolve(__dirname, 'src/internals/index.ts'),
      },
      name: 'JfDevelopsMultiStepForm',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    sourcemap: true,
    emptyOutDir: true,
    minify: false,
  },
  test: {
    environment: 'jsdom',
  },
});
