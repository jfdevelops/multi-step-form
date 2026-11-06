import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  clean: true,
  unbundle: true,
  sourcemap: true,
  minify: false,
  dts: true,
  external: ['@jfdevelops/multi-step-form-builder-core', 'joi'],
  fixedExtension: true,
  exports: true,
  platform: 'neutral',
  treeshake: true,
});
