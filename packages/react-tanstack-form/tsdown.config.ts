import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  clean: true,
  unbundle: true,
  sourcemap: true,
  minify: false,
  dts: true,
  external: [
    '@jfdevelops/react-multi-step-form',
    '@tanstack/react-form',
    'react',
    'react/jsx-runtime',
  ],
  fixedExtension: true,
  exports: true,
  platform: 'neutral',
  treeshake: true,
});
