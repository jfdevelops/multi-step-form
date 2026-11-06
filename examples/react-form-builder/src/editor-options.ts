/**
 * Compiler options for the generated module, shared by the editor and the test that checks it.
 * The numbers are TypeScript's enum values, which Monaco's bundled TypeScript (5.9) uses too.
 */
export const COMPILER_OPTIONS = {
  target: 99, // ESNext
  module: 99, // ESNext
  moduleResolution: 100, // Bundler: resolves package `exports` like Vite does
  jsx: 4, // ReactJSX
  strict: true,
  skipLibCheck: true,
  noEmit: true,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
} as const;
