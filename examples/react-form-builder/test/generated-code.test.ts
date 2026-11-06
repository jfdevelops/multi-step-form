/**
 * The code editor shows the generated module with the types `editorTypes` serves. This runs the
 * same check the editor does: the module must typecheck in strict mode with every validator
 * library, and hovering shows the inferred form.
 */
import {
  createFormBuilder,
  createRegistry,
  generateCode,
  type FormBuilder,
} from '@jfdevelops/multi-step-form-builder-core';
import { arktypeAdapter } from '@jfdevelops/multi-step-form-builder-arktype';
import { effectAdapter } from '@jfdevelops/multi-step-form-builder-effect';
import { joiAdapter } from '@jfdevelops/multi-step-form-builder-joi';
import { valibotAdapter } from '@jfdevelops/multi-step-form-builder-valibot';
import { yupAdapter } from '@jfdevelops/multi-step-form-builder-yup';
import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { collectTypes } from '../editor-types';
import { COMPILER_OPTIONS } from '../src/editor-options';

const registry = createRegistry({
  validators: [zodAdapter, valibotAdapter, arktypeAdapter, effectAdapter, yupAdapter, joiAdapter],
});

/** A form using every kind of value and check. */
function buildForm(builder: FormBuilder) {
  builder.fields.add('string.email', undefined, { key: 'email', isRequired: true, description: 'We never share it' });
  builder.fields.add('string.password', undefined, {
    key: 'password',
    isRequired: true,
    schema: { kind: 'string', checks: [{ check: 'minLength', value: 8 }, { check: 'pattern', value: '[A-Z]' }] },
  });
  builder.fields.add('string.password', undefined, {
    key: 'confirm',
    isRequired: true,
    schema: { kind: 'string', checks: [{ check: 'equalsField', field: 'password' }] },
  });
  builder.fields.add('string.url', undefined, { key: 'website' });
  builder.fields.add('number', undefined, {
    key: 'age',
    schema: { kind: 'number', nullable: true, checks: [{ check: 'min', value: 18 }, { check: 'integer' }] },
  });
  builder.fields.add('choice', undefined, { key: 'location', isRequired: true });
  builder.fields.add('multiChoice', undefined, { key: 'tags', isRequired: true });
  builder.fields.add('date', undefined, {
    key: 'startsOn',
    schema: { kind: 'date', checks: [{ check: 'min', value: '2026-01-01' }] },
  });
  builder.fields.add('object', undefined, {
    key: 'faces',
    schema: {
      kind: 'object',
      properties: [
        { key: 'min', schema: { kind: 'number' } },
        {
          key: 'faces',
          schema: {
            kind: 'array',
            checks: [{ check: 'maxLength', value: 10 }],
            item: {
              kind: 'object',
              properties: [
                { key: 'id', schema: { kind: 'string', checks: [{ check: 'uuid' }] } },
                { key: 'name', schema: { kind: 'string', optional: true } },
              ],
            },
          },
        },
        {
          key: 'services',
          schema: {
            kind: 'record',
            value: {
              kind: 'object',
              properties: [
                { key: 'price', schema: { kind: 'number' } },
                { key: 'type', schema: { kind: 'enum', values: ['addon', 'primary'] } },
              ],
            },
          },
        },
        { key: 'contact', schema: { kind: 'union', options: [{ kind: 'string' }, { kind: 'number' }] } },
        { key: 'agreed', schema: { kind: 'literal', value: true } },
        { key: 'extra', schema: { kind: 'unknown' } },
      ],
    },
  });
}

function check(source: string, packages: readonly string[]) {
  const files = new Map<string, string>();

  for (const name of packages) {
    for (const [path, text] of collectTypes(name, process.cwd())) files.set(path.replace('file://', ''), text);
  }

  files.set('/form.ts', source);

  const readFile = (name: string) => files.get(name) ?? ts.sys.readFile(name);
  const service = ts.createLanguageService({
    getScriptFileNames: () => ['/form.ts'],
    getScriptVersion: () => '1',
    getScriptSnapshot: (name) => {
      const text = readFile(name);
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({ ...COMPILER_OPTIONS, lib: ['lib.esnext.d.ts', 'lib.dom.d.ts'] }),
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (name) => files.has(name) || ts.sys.fileExists(name),
    readFile,
    directoryExists: (name) =>
      [...files.keys()].some((key) => key.startsWith(name.endsWith('/') ? name : `${name}/`)) ||
      ts.sys.directoryExists(name),
    getDirectories: () => [],
  });

  const errors = [...service.getSyntacticDiagnostics('/form.ts'), ...service.getSemanticDiagnostics('/form.ts')].map(
    (diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  );
  const hover = (name: string) =>
    ts.displayPartsToString(
      service.getQuickInfoAtPosition('/form.ts', source.indexOf(`export const ${name}`) + 'export const '.length)
        ?.displayParts,
    ).replace(/\s+/g, ' ');

  return { errors, hover };
}

describe('generated code in the editor', () => {
  it.each(['builtin', 'zod', 'valibot', 'arktype', 'effect', 'yup', 'joi'])(
    'typechecks with %s and infers the form',
    (library) => {
      const builder = createFormBuilder({ registry });
      builder.settings.update({ validator: library });
      buildForm(builder);

      const code = generateCode(builder.toJSON(), { registry });
      const { errors, hover } = check(code.source, code.packages);

      expect(errors).toEqual([]);
      expect(hover('createForm')).toContain('readonly email: { readonly defaultValue: ""');
      // The library's own schema type, not `any` (Joi's types use `any` inside, by design).
      expect(hover('step1Schema')).not.toMatch(/^const step1Schema: any$/);
    },
    60_000,
  );
});
