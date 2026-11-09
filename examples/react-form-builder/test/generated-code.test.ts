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
  type GeneratedFile,
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
  builder.fields.add({
    type: 'string.email',
    key: 'email',
    isRequired: true,
    description: 'We never share it',
    props: { autoComplete: 'email' },
  });
  builder.fields.add({
    type: 'string.password',
    key: 'password',
    isRequired: true,
    schema: {
      kind: 'string',
      checks: [
        { check: 'minLength', value: 8 },
        { check: 'pattern', value: '[A-Z]' },
      ],
    },
  });
  builder.fields.add({
    type: 'string.password',
    key: 'confirm',
    isRequired: true,
    schema: { kind: 'string', checks: [{ check: 'equalsField', field: 'password' }] },
  });
  builder.fields.add({ type: 'string.url', key: 'website' });
  builder.fields.add({
    type: 'number',
    key: 'age',
    schema: { kind: 'number', nullable: true, checks: [{ check: 'min', value: 18 }, { check: 'integer' }] },
  });
  builder.fields.add({ type: 'choice', key: 'location', isRequired: true });
  builder.fields.add({ type: 'multiChoice', key: 'tags', isRequired: true });
  builder.fields.add({
    type: 'date',
    key: 'startsOn',
    schema: { kind: 'date', checks: [{ check: 'min', value: '2026-01-01' }] },
  });
  builder.fields.add({
    type: 'object',
    key: 'equipment',
    schema: {
      kind: 'object',
      properties: [
        { key: 'min', schema: { kind: 'number' } },
        {
          key: 'equipment',
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
          key: 'supplies',
          schema: {
            kind: 'record',
            value: {
              kind: 'object',
              properties: [
                { key: 'price', schema: { kind: 'number' } },
                { key: 'type', schema: { kind: 'enum', values: ['consumable', 'reusable'] } },
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

function check(
  source: string,
  packages: readonly string[],
  modules: readonly GeneratedFile[] = [{ path: 'form.ts', source }],
) {
  const files = new Map<string, string>();

  for (const name of packages) {
    for (const [path, text] of collectTypes(name, process.cwd()))
      files.set(path.replace('file://', ''), text);
  }

  for (const file of modules) {
    files.set(`/${file.path}`, file.source);
  }

  const readFile = (name: string) => files.get(name) ?? ts.sys.readFile(name);
  const service = ts.createLanguageService({
    getScriptFileNames: () => modules.map((file) => `/${file.path}`),
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

  const errors = modules
    .flatMap((file) => [
      ...service.getSyntacticDiagnostics(`/${file.path}`),
      ...service.getSemanticDiagnostics(`/${file.path}`),
    ])
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  const hover = (name: string) => {
    const file = modules.find((entry) => entry.source.includes(`export const ${name} =`))!;

    return ts
      .displayPartsToString(
        service.getQuickInfoAtPosition(
          `/${file.path}`,
          file.source.indexOf(`export const ${name}`) + 'export const '.length,
        )?.displayParts,
      )
      .replace(/\s+/g, ' ');
  };

  return { errors, hover };
}

describe('generated code in the editor', () => {
  it('typechecks a multi-step project with named instances and custom factory names', () => {
    const builder = createFormBuilder({ registry });
    builder.settings.update({ instances: ['organizer', 'reviewer'] });
    builder.fields.add({ type: 'text', key: 'title' });
    builder.steps.add({ title: 'Schedule', fields: [{ type: 'date', key: 'date' }] });
    const code = generateCode(builder.toJSON(), { registry, factoryName: 'createWorkshop' });
    const project = check(code.source, code.packages, code.files);

    expect(project.errors).toEqual([]);
    expect(code.files.map((file) => file.path)).toEqual(['form.ts', 'steps/step1.ts', 'steps/step2.ts']);
    expect(code.files[0]!.source).toContain('instances: ["organizer","reviewer"]');
    expect(code.files[0]!.source).not.toContain('export const form =');
    expect(project.hover('createWorkshop')).toContain('readonly ["organizer", "reviewer"]');
  });

  it.each(['zod', 'valibot', 'arktype', 'effect'])(
    'infers structured defaults from the %s validator without duplicating their types',
    (library) => {
      const builder = createFormBuilder({ registry });
      builder.settings.update({ validator: library });
      builder.fields.add({
        type: 'array',
        key: 'topics',
        defaultValue: [],
        schema: { kind: 'array', nullable: true, item: { kind: 'enum', values: ['red', 'green'] } },
      });
      builder.fields.add({
        type: 'choice',
        key: 'attendance',
        isRequired: true,
        props: {
          options: [
            { value: 'online', label: 'Online' },
            { value: 'in_person', label: 'In person' },
          ],
        },
      });
      builder.fields.add({
        type: 'object',
        key: 'preferences',
        defaultValue: {},
        schema: { kind: 'object', properties: [{ key: 'note', schema: { kind: 'string', optional: true } }] },
      });
      const code = generateCode(builder.toJSON(), { registry });
      const assertions = `
const topics: typeof step1.fields.topics.defaultValue = ['red', 'green'];
const nullableTopics: typeof step1.fields.topics.defaultValue = null;
// @ts-expect-error The schema restricts the choices.
const invalidTopics: typeof step1.fields.topics.defaultValue = ['blue'];
// @ts-expect-error Root optionality does not make a supplied default undefined.
const missingTopics: typeof step1.fields.topics.defaultValue = undefined;
const emptyAttendance: typeof step1.fields.attendance.defaultValue = '';
const attendance: typeof step1.fields.attendance.defaultValue = 'online';
// @ts-expect-error The initial empty value does not widen the choices to every string.
const invalidAttendance: typeof step1.fields.attendance.defaultValue = 'other';
const preferences: typeof step1.fields.preferences.defaultValue = { note: 'Hello' };
// @ts-expect-error The nested property remains a string.
const invalidPreferences: typeof step1.fields.preferences.defaultValue = { note: 42 };
`;

      expect(code.types).toEqual([]);
      expect(code.source).toContain('ResolveValidatorInput<typeof step1Schema>');
      expect(code.source).not.toContain('export type Step1Topics');
      expect(code.source).toContain('export type Step1Values = ResolveValidatorInput<typeof step1Schema>;');
      expect(code.validatorsSource).not.toContain('ResolveValidatorInput');
      const files = code.files.map((file) =>
        file.path === 'steps/step1.ts' ? { ...file, source: file.source + assertions } : file,
      );
      expect(check(code.source, code.packages, files).errors).toEqual([]);
    },
    60_000,
  );

  it.each(['builtin', 'zod', 'valibot', 'arktype', 'effect', 'yup', 'joi'])(
    'typechecks with %s and infers the form',
    (library) => {
      const builder = createFormBuilder({ registry });
      builder.settings.update({ validator: library });
      buildForm(builder);

      const code = generateCode(builder.toJSON(), { registry });
      const { errors, hover } = check(code.source, code.packages);

      expect(errors).toEqual([]);
      const split = check(code.source, code.packages, code.files);
      expect(split.errors).toEqual([]);
      expect(split.hover('createForm')).toContain('readonly email: { readonly defaultValue: ""');
      expect(split.hover('createForm')).toContain('readonly autoComplete: "email"');
      expect(split.hover('step1Schema')).not.toMatch(/^const step1Schema: any$/);
      expect(code.source).not.toContain('fieldMetadata');
      expect(hover('createForm')).toContain('readonly description: "We never share it"');
      expect(hover('createForm')).toContain('readonly autoComplete: "email"');
      expect(hover('createForm')).toContain('readonly email: { readonly defaultValue: ""');
      // The library's own schema type, not `any` (Joi's types use `any` inside, by design).
      expect(hover('step1Schema')).not.toMatch(/^const step1Schema: any$/);
    },
    60_000,
  );
});
