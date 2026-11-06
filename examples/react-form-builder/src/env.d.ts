/** Served by the `editorTypes` Vite plugin (see `editor-types.ts`). */
declare module 'virtual:editor-types' {
  /** Package name → loader of `{ [file:///node_modules/…]: declaration file contents }`. */
  export const loaders: Record<string, () => Promise<{ default: Record<string, string> }>>;
}
