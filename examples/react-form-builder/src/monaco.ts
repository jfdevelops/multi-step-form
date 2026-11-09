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

typescriptDefaults.setEagerModelSync(true);

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

const generatedModels = new Map<string, monaco.editor.ITextModel>();

/** Keeps every generated module available for relative imports and type inference. */
export function syncGeneratedFiles(files: readonly { path: string; source: string }[]) {
  const paths = new Set(files.map((file) => `file:///generated/${file.path}`));

  for (const [path, model] of generatedModels) {
    if (!paths.has(path)) {
      model.dispose();
      generatedModels.delete(path);
    }
  }

  for (const file of files) {
    const path = `file:///generated/${file.path}`;
    const model = generatedModels.get(path);

    if (model) {
      if (model.getValue() !== file.source) {
        model.setValue(file.source);
      }
    } else {
      const uri = monaco.Uri.parse(path);
      generatedModels.set(path, monaco.editor.getModel(uri) ?? monaco.editor.createModel(file.source, 'typescript', uri));
    }
  }
}

export function disposeGeneratedFiles() {
  for (const model of generatedModels.values()) {
    model.dispose();
  }

  generatedModels.clear();
}
