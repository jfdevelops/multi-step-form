/**
 * Monaco, bundled locally (no CDN), with the TypeScript language service set up for the generated
 * module. Types load per package, when the generated code first imports it.
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TypeScriptWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import { loaders } from 'virtual:editor-types';
import { COMPILER_OPTIONS } from './editor-options';

self.MonacoEnvironment = {
  getWorker: (_id, label) => (label === 'typescript' || label === 'javascript' ? new TypeScriptWorker() : new EditorWorker()),
};

loader.config({ monaco });

const { typescriptDefaults } = monaco.typescript;

typescriptDefaults.setCompilerOptions({
  ...COMPILER_OPTIONS,
  // Monaco's typings stop at `NodeJs`, but its bundled TypeScript (5.9) supports `Bundler` (100).
  moduleResolution: COMPILER_OPTIONS.moduleResolution as number as monaco.typescript.ModuleResolutionKind,
});

const loaded = new Map<string, Promise<void>>();

/** Loads the type declarations of `packages` (and their dependencies) into the editor. */
export function loadTypes(packages: readonly string[]) {
  return Promise.all(
    packages.map((name) => {
      const load = loaders[name];

      if (!load) return undefined;
      if (!loaded.has(name)) {
        loaded.set(
          name,
          load().then(({ default: files }) => {
            for (const [path, contents] of Object.entries(files)) typescriptDefaults.addExtraLib(contents, path);
          }),
        );
      }

      return loaded.get(name);
    }),
  );
}
