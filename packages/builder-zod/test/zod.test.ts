import {
  compileDefinition,
  compileStepValidator,
  createFormBuilder,
  createRegistry,
  toSource,
  type StepDefinition,
} from '@jfdevelops/multi-step-form-builder-core';
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';
import { describe, expect, it } from 'vitest';
import { zodAdapter } from '../src';

const registry = createRegistry({ validators: [zodAdapter] });

const step: StepDefinition = {
  id: 's1',
  title: 'Account',
  validation: {
    kind: 'schema',
    library: 'zod',
    fields: {
      password: { type: 'string', checks: [{ check: 'minLength', value: 8 }] },
      confirm: {
        type: 'string',
        checks: [{ check: 'equalsField', field: 'password', message: 'Passwords must match' }],
      },
      age: { type: 'number', checks: [{ check: 'min', value: 18 }, { check: 'integer' }] },
    },
  },
  fields: [
    { id: 'f1', key: 'email', type: 'string.email', defaultValue: '', isRequired: true },
    { id: 'f2', key: 'password', type: 'string.password', defaultValue: '', isRequired: true },
    { id: 'f3', key: 'confirm', type: 'string.password', defaultValue: '', isRequired: true },
    { id: 'f4', key: 'age', type: 'number', defaultValue: 0 },
    { id: 'f5', key: 'website', type: 'string.url', defaultValue: '' },
  ],
};

function issues(values: Record<string, unknown>) {
  const validator = compileStepValidator(step, registry)!;
  const result = validator['~standard'].validate(values) as {
    issues?: { message: string; path?: readonly (PropertyKey | { key: PropertyKey })[] }[];
  };

  return (result.issues ?? []).map((issue) => {
    const segment = issue.path?.[0];
    const key = typeof segment === 'object' ? segment.key : segment;

    return `${String(key)}: ${issue.message}`;
  });
}

describe('zodAdapter', () => {
  it('produces a zod-backed Standard Schema validator', () => {
    const validator = compileStepValidator(step, registry)!;

    expect(validator['~standard'].vendor).toBe('zod');
  });

  it('behaves like the built-in validator', () => {
    expect(issues({ email: '', password: '', confirm: '', age: undefined, website: '' })).toEqual([
      'email: Required',
      'password: Required',
      'confirm: Required',
    ]);

    expect(
      issues({ email: 'nope', password: 'short', confirm: 'x', age: 16.5, website: 'not a url' }),
    ).toEqual([
      'email: Must be a valid email address',
      'password: Must be at least 8 characters',
      'age: Must be at least 18',
      'age: Must be a whole number',
      'website: Must be a valid URL',
    ]);

    expect(
      issues({ email: 'a@b.co', password: 'long enough', confirm: 'different!', age: 30, website: '' }),
    ).toEqual(['confirm: Passwords must match']);

    expect(
      issues({ email: 'a@b.co', password: 'long enough', confirm: 'long enough', age: 30, website: 'https://x.dev' }),
    ).toEqual([]);
  });

  it('reports checks it cannot express', () => {
    expect(zodAdapter.supports({ type: 'boolean', checks: [{ check: 'minLength', value: 1 }] })).toMatch(
      /string or array/,
    );
    expect(zodAdapter.supports({ type: 'string', checks: [{ check: 'pattern', value: '(' }] })).not.toBe(
      true,
    );
  });

  it('drives multi-step form completeness', () => {
    const schema = defineMultiStepForm(
      compileDefinition({ schemaVersion: 1, id: 'f', revision: 0, steps: [step] }, { registry }) as never,
    ).configure()();

    expect((schema.stepSchema.value as Record<string, { isComplete: boolean }>).step1!.isComplete).toBe(false);
  });

  it('emits runnable zod source code', async () => {
    const source = toSource(
      { schemaVersion: 1, id: 'f', revision: 0, steps: [step] },
      { registry, importFrom: '@jfdevelops/multi-step-form-core' },
    );

    expect(source).toContain("import { z } from 'zod';");
    expect(source).toContain('const isEmpty = ');
    expect(source).toContain('.superRefine((values, ctx) => {');

    // Evaluate the emitted validator expression and check it matches the compiled one.
    const { z } = await import('zod');
    const expression = source.slice(source.indexOf('validateFields: ') + 'validateFields: '.length);
    const code = expression.slice(0, expression.lastIndexOf('}),') + 2);
    const declarations = source
      .split('\n')
      .filter((line) => line.startsWith('const '))
      .join('\n');
    const validator = new Function('z', `${declarations}\nreturn ${code};`)(z);

    expect(validator.safeParse({ email: 'a@b.co', password: 'long enough', confirm: 'long enough', age: 30, website: '' }).success).toBe(true);
    expect(validator.safeParse({ email: 'a@b.co', password: 'long enough', confirm: 'nope', age: 30, website: '' }).success).toBe(false);
  });

  it('can be chosen per step in the builder', () => {
    const builder = createFormBuilder({ registry });
    const stepId = builder.getSnapshot().activeStepId!;

    builder.validation.useLibrary(stepId, 'zod');
    expect(builder.getStep(stepId)?.validation).toEqual({ kind: 'schema', library: 'zod', fields: {} });
    expect(builder.getSnapshot().issues).toEqual([]);
  });
});
