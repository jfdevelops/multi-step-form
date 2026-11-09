/** The shipped worker implementation exposes no declaration for its constructor. */
declare module '*monaco-editor/esm/vs/languages/features/typescript/tsWorker.js' {
  export const TypeScriptWorker: new (
    context: { getMirrorModels(): never[] },
    options: {
      compilerOptions: import('typescript').CompilerOptions;
      extraLibs: Record<string, { content: string; version: number }>;
    },
  ) => {
    getQuickInfoAtPosition(file: string, position: number): Promise<import('typescript').QuickInfo | undefined>;
    getSemanticDiagnostics(file: string): Promise<readonly unknown[]>;
  };
}
