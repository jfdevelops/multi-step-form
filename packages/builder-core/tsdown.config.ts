import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm', 'cjs'],
  clean: true,
  unbundle: true,
  sourcemap: true,
  minify: false,
  dts: true,
  external: ['@jfdevelops/multi-step-form-core', '@standard-schema/spec'],
  fixedExtension: true,
  exports: true,
  platform: 'neutral',
  treeshake: true,
});
