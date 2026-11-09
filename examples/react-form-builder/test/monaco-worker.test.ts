import { TypeScriptWorker } from '../node_modules/monaco-editor/esm/vs/languages/features/typescript/tsWorker.js';
import { collectTypes } from '../editor-types';
import { COMPILER_OPTIONS } from '../src/editor-options';
import { it, expect } from 'vitest';

it('resolves defineStep in the actual Monaco worker', async () => {
  const source = `import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';\nexport const step = defineMultiStepForm.defineStep({ title: 'Contact', fields: { name: { defaultValue: '' } } });`;
  const path = 'file:///generated/steps/step1.ts';
  const files = collectTypes('@jfdevelops/react-multi-step-form', process.cwd());
  files.set(path, source);
  const worker = new TypeScriptWorker({ getMirrorModels: () => [] }, {
    compilerOptions: COMPILER_OPTIONS,
    extraLibs: Object.fromEntries([...files].map(([name, content]) => [name, { content, version: 1 }])),
  });
  const info = await worker.getQuickInfoAtPosition(path, source.indexOf('.defineStep') + 2);
  const text = info?.displayParts?.map((part) => part.text).join('');
  expect(await worker.getSemanticDiagnostics(path)).toEqual([]);
  expect(text).not.toBe('any');
  expect(text).toContain('readonly name:');
  expect(text).toContain('defineStep');
});
