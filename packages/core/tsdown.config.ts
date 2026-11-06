import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    _internals: 'src/internals/index.ts',
  },
  unbundle: true,
  sourcemap: true,
  minify: false,
  exports: true,
  format: ['cjs', 'es'],
  clean: true,
  // The error classes' declarations use create-error types that only the local patch exports, so
  // the declaration build inlines create-error instead of importing the unpatched package.
  noExternal: (id, importer) =>
    id.startsWith('@jfdevelops/create-error') &&
    /\.d\.[cm]?ts$/.test(importer ?? ''),
  dts: { resolve: [/^@jfdevelops\/create-error/] },
  fixedExtension: true,
  tsconfig: 'tsconfig.build.json',
  // Inlined dependency chunks keep their `node_modules/...` path, which `pnpm pack` leaves out.
  outputOptions: (options) => ({
    ...options,
    entryFileNames: (chunk) => {
      const pattern =
        typeof options.entryFileNames === 'function'
          ? options.entryFileNames(chunk)
          : (options.entryFileNames ?? '[name].js');

      return pattern.replace(
        '[name]',
        chunk.name.replace(/^node_modules\/.*\/node_modules\//, 'vendor/'),
      );
    },
  }),
});
