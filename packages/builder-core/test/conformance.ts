/**
 * A shared suite every validator adapter runs, so a step behaves the same whichever library
 * compiles it: the same fields fail, with the messages the builder controls.
 */
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  compileDefinition,
  createRegistry,
  generateCode,
  resolveStepSchema,
  type FormDefinition,
  type StepDefinition,
  type ValidatorAdapter,
} from '../src';

export const conformanceStep: StepDefinition = {
  id: 's1',
  title: 'Everything',
  fields: [
    { id: 'f1', key: 'email', type: 'string.email', isRequired: true, defaultValue: '', schema: { kind: 'string', checks: [{ check: 'email' }] } },
    { id: 'f2', key: 'password', type: 'string.password', isRequired: true, defaultValue: '', schema: { kind: 'string', checks: [{ check: 'minLength', value: 8 }] } },
    {
      id: 'f3',
      key: 'confirm',
      type: 'string.password',
      isRequired: true,
      defaultValue: '',
      schema: { kind: 'string', checks: [{ check: 'equalsField', field: 'password', message: 'Passwords must match' }] },
    },
    { id: 'f4', key: 'nickname', type: 'string', defaultValue: '', schema: { kind: 'string', checks: [{ check: 'maxLength', value: 5 }] } },
    { id: 'f5', key: 'age', type: 'number', defaultValue: 0, schema: { kind: 'number', checks: [{ check: 'min', value: 18 }, { check: 'integer' }] } },
    { id: 'f6', key: 'plan', type: 'string.select', isRequired: true, defaultValue: '', schema: { kind: 'enum', values: ['free', 'pro'] } },
    { id: 'f7', key: 'website', type: 'string.url', defaultValue: '', schema: { kind: 'string', checks: [{ check: 'url' }] } },
    { id: 'f8', key: 'startsOn', type: 'date', defaultValue: '2026-06-01T00:00:00.000Z', schema: { kind: 'date', checks: [{ check: 'min', value: '2026-01-01' }] } },
    { id: 'f9', key: 'tags', type: 'array', isRequired: true, defaultValue: [], schema: { kind: 'array', item: { kind: 'string' }, checks: [{ check: 'maxLength', value: 3 }] } },
    {
      id: 'f10',
      key: 'profile',
      type: 'object',
      isRequired: true,
      defaultValue: { name: '', location: 'come_to_me' },
      schema: {
        kind: 'object',
        properties: [
          { key: 'name', schema: { kind: 'string', checks: [{ check: 'pattern', value: '^[A-Z]', message: 'Capitalize it' }] } },
          { key: 'age', schema: { kind: 'number', optional: true } },
          { key: 'location', schema: { kind: 'enum', values: ['come_to_me', 'i_come_to_you'] } },
          { key: 'contact', schema: { kind: 'union', optional: true, options: [{ kind: 'string' }, { kind: 'number' }] } },
          { key: 'note', schema: { kind: 'string', nullable: true } },
        ],
      },
    },
    { id: 'f11', key: 'scores', type: 'object', defaultValue: {}, schema: { kind: 'record', value: { kind: 'number', checks: [{ check: 'min', value: 0 }] } } },
    { id: 'f12', key: 'agree', type: 'boolean', isRequired: true, defaultValue: true, schema: { kind: 'literal', value: true } },
    {
      id: 'f13',
      key: 'faces',
      type: 'array',
      defaultValue: [],
      schema: {
        kind: 'array',
        item: {
          kind: 'object',
          properties: [
            { key: 'id', schema: { kind: 'string', checks: [{ check: 'uuid' }] } },
            { key: 'count', schema: { kind: 'number' } },
          ],
        },
      },
    },
  ],
};

const valid = {
  email: 'a@b.co',
  password: 'long enough',
  confirm: 'long enough',
  nickname: '',
  age: undefined,
  plan: 'pro',
  website: '',
  startsOn: new Date('2026-06-01'),
  tags: ['x'],
  profile: { name: 'Ada', location: 'i_come_to_you', note: null },
  scores: { a: 1 },
  agree: true,
  faces: [{ id: '0b5c9a4e-3c9f-4f5b-9a3a-2f6c1d7e8a90', count: 2 }],
};

function normalizePath(path: readonly (PropertyKey | { key: PropertyKey })[] | undefined) {
  return (path ?? []).map((segment) => String(typeof segment === 'object' ? segment.key : segment)).join('.');
}

function run(adapter: ValidatorAdapter, values: Record<string, unknown>) {
  const registry = createRegistry({ validators: [adapter] });
  const definition: FormDefinition = {
    schemaVersion: 1,
    id: 'f',
    revision: 0,
    settings: { validator: adapter.library },
    steps: [conformanceStep],
  };
  const compiled = compileDefinition(definition, { registry });
  const result = compiled.steps.step1!.validateFields!['~standard'].validate(values);

  if (result instanceof Promise) throw new Error('Validators must be synchronous');

  const issues = (result.issues ?? []).map((issue) => ({
    path: normalizePath(issue.path as never),
    message: issue.message,
  }));
  const byPath = new Map<string, string[]>();

  for (const issue of issues) byPath.set(issue.path, [...(byPath.get(issue.path) ?? []), issue.message]);

  return byPath;
}

export function describeConformance(adapter: ValidatorAdapter) {
  describe(`${adapter.label} conformance`, () => {
    it('supports every node in the suite', () => {
      const spec = resolveStepSchema(conformanceStep, { validator: adapter.library })!;
      const unsupported: string[] = [];
      const visit = (node: Parameters<ValidatorAdapter['supports']>[0]) => {
        const supported = adapter.supports(node);
        if (supported !== true) unsupported.push(supported);
        if (node.kind === 'object') node.properties.forEach((property) => visit(property.schema));
        if (node.kind === 'array') visit(node.item);
        if (node.kind === 'record') visit(node.value);
        if (node.kind === 'union') node.options.forEach(visit);
      };

      spec.fields.forEach((field) => visit(field.schema));
      expect(unsupported).toEqual([]);
    });

    it('accepts valid values and empty optional fields', () => {
      expect([...run(adapter, valid).keys()]).toEqual([]);
      expect([...run(adapter, { ...valid, nickname: undefined, website: undefined, startsOn: undefined }).keys()]).toEqual([]);
    });

    it('rejects empty required fields', () => {
      const issues = run(adapter, {
        ...valid,
        email: '',
        password: '',
        confirm: '',
        plan: '',
        tags: [],
      });

      expect([...issues.keys()].sort()).toEqual(['confirm', 'email', 'password', 'plan', 'tags']);
      expect(issues.get('email')).toContain('Required');
      expect(issues.get('password')).toContain('Required');
    });

    it('reports failing checks with the builder’s messages', () => {
      const issues = run(adapter, {
        ...valid,
        email: 'nope',
        password: 'short',
        confirm: 'short',
        nickname: 'too long',
        age: 16.5,
        plan: 'enterprise',
        website: 'not a url',
        startsOn: new Date('2025-06-01'),
        tags: ['a', 'b', 'c', 'd'],
        profile: { name: 'ada', age: 'x', location: 'moon', contact: true, note: 5 },
        scores: { a: -1 },
        agree: false,
        faces: [{ id: 'nope', count: 'x' }],
      });

      expect([...issues.keys()].sort()).toEqual(
        [
          'age',
          'agree',
          'email',
          'faces.0.count',
          'faces.0.id',
          'nickname',
          'password',
          'plan',
          'profile.age',
          'profile.contact',
          'profile.location',
          'profile.name',
          'profile.note',
          'scores.a',
          'startsOn',
          'tags',
          'website',
        ].sort(),
      );
      expect(issues.get('email')).toContain('Must be a valid email address');
      expect(issues.get('password')).toContain('Must have at least 8 characters');
      // Some libraries stop at a value's first failing check, so only the first is guaranteed.
      expect(issues.get('age')).toContain('Must be at least 18');
      expect(issues.get('website')).toContain('Must be a valid URL');
      expect(issues.get('profile.name')).toContain('Capitalize it');
      expect(issues.get('tags')).toContain('Must have at most 3 items');
    });

    it('reports equalsField refinements once the fields are otherwise valid', () => {
      const issues = run(adapter, { ...valid, confirm: 'different!!' });

      expect([...issues.keys()]).toEqual(['confirm']);
      expect(issues.get('confirm')).toContain('Passwords must match');
    });

    it('drives multi-step form completeness', () => {
      const registry = createRegistry({ validators: [adapter] });
      const compiled = compileDefinition(
        { schemaVersion: 1, id: 'f', revision: 0, settings: { validator: adapter.library }, steps: [conformanceStep] },
        { registry },
      );
      const form = defineMultiStepForm(compiled as never).configure()() as unknown as {
        stepSchema: { value: Record<string, { isComplete: boolean }> };
      };

      expect(form.stepSchema.value.step1!.isComplete).toBe(false);
    });

    it('emits code that builds the same validator', async () => {
      const registry = createRegistry({ validators: [adapter] });
      const code = generateCode(
        { schemaVersion: 1, id: 'f', revision: 0, settings: { validator: adapter.library }, steps: [conformanceStep] },
        { registry },
      );
      const step = code.steps[0]!;
      const emitted = adapter.emit(resolveStepSchema(conformanceStep, { validator: adapter.library })!);

      expect(step.library).toBe(adapter.library);
      expect(code.packages).toEqual(expect.arrayContaining([...adapter.packages]));
      expect(code.source).toContain(`validateFields: ${step.validator!.name},`);
      expect(step.validator!.code).toBe(emitted.code);
      emitted.imports.forEach((line) => expect(code.source).toContain(line));
      emitted.declarations.forEach((line) => expect(code.source).toContain(line));

      // Evaluate the emitted validator with the real library and compare behavior.
      const modules = await Promise.all(
        adapter.packages.map((name) =>
          // Within this package, use the source rather than a (possibly stale) build.
          name === '@jfdevelops/multi-step-form-builder-core' ? import('../src') : import(name),
        ),
      );
      const bindings: Record<string, unknown> = {};

      emitted.imports.forEach((line) => {
        const from = /from '([^']+)'/.exec(line)![1]!;
        const mod = modules[adapter.packages.indexOf(from)] as Record<string, unknown>;
        const named = /import \{ ([^}]+) \}/.exec(line);
        const namespace = /import \* as (\w+)/.exec(line);
        const fallback = /import (\w+) from/.exec(line);

        if (named) named[1]!.split(',').forEach((name) => (bindings[name.trim()] = mod[name.trim()]));
        else if (namespace) bindings[namespace[1]!] = mod;
        else if (fallback) bindings[fallback[1]!] = mod.default ?? mod;
      });

      // Emitted code is TypeScript; strip the types before running it.
      const { outputText } = ts.transpileModule(
        `(() => {\n${emitted.declarations.join('\n')}\nreturn ${emitted.code};\n})()`,
        { compilerOptions: { target: ts.ScriptTarget.ES2022 } },
      );
      const validator = new Function(...Object.keys(bindings), `return ${outputText}`)(
        ...Object.values(bindings),
      ) as { '~standard': { validate(value: unknown): { issues?: unknown[] } } };

      expect(validator['~standard'].validate(valid).issues ?? []).toEqual([]);
      expect((validator['~standard'].validate({ ...valid, email: 'nope' }).issues ?? []).length).toBeGreaterThan(0);
    });
  });
}
