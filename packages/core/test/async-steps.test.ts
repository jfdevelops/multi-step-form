import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { defineMultiStepForm } from '../src';
import { type } from 'arktype';
import { createMockStorage } from './utils/create-mock-storage';

describe('async step definitions', () => {
  it('resolves mixed definitions lazily and preserves resets, state, validation and casing', async () => {
    const loader = vi.fn(async () => ({
      title: 'Loaded',
      fields: { firstName: { defaultValue: 'initial' } },
      validateFields: type({ firstName: 'string' }),
      state: {
        length: { select: 'firstName', value: (field: string) => field.length },
      },
    }));
    const schema = defineMultiStepForm({
      steps: {
        step1: { title: 'Sync', fields: { age: { defaultValue: 1 } } },
        step2: loader,
      },
    }).configure({ nameTransformCasing: 'camel' })();
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    expect(loader).not.toHaveBeenCalled();
    expect(schema.stepSchema.isStepComplete('step2')).toBe(false);
    expect(schema.stepSchema.value.step2.isComplete).toBe(false);
    expect(schema.stepSchema.getStepStatus('step2')).toBe('idle');
    await Promise.all([
      schema.stepSchema.resolveStep('step2'),
      schema.stepSchema.resolveStep('step2'),
    ]);
    expect(loader).toHaveBeenCalledTimes(1);
    const step = schema.stepSchema.value.step2;
    expectTypeOf(step.fields.firstName.defaultValue).toEqualTypeOf<string>();
    expect(step.fields.firstName.name).toBe('firstName');
    expect(step.state.length.value).toBe(7);
    expect(step.validate().success).toBe(true);
    expect(schema.stepSchema.isStepComplete('step2')).toBe(true);
    step.update({
      fields: 'all',
      updater: ({ ctx }) => ({
        ...ctx.step2,
        fields: {
          ...ctx.step2.fields,
          firstName: { ...ctx.step2.fields.firstName, defaultValue: 'Pat' },
        },
      }),
    });
    expect(schema.stepSchema.value.step2.state.length.value).toBe(3);
    schema.stepSchema.value.step2.reset({ fields: 'all' });
    expect(schema.stepSchema.value.step2.fields.firstName.defaultValue).toBe(
      'initial',
    );
    expect(schema.stepSchema.value.step1.fields.age.defaultValue).toBe(1);
  });

  it('records loader failures and allows a retry', async () => {
    const error = new Error('Loading failed');
    const loader = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue({
        title: 'Loaded',
        fields: { name: { defaultValue: '' } },
      });
    const schema = defineMultiStepForm({
      steps: { step1: loader },
    }).configure()();
    await expect(schema.stepSchema.resolveStep('step1')).rejects.toBe(error);
    expect(schema.stepSchema.getStepError('step1')).toBe(error);
    expect(schema.stepSchema.isStepComplete('step1')).toBe(false);
    expect(() => schema.stepSchema.suspendStep('step1')).toThrow(error);
    await schema.stepSchema.resolveStep('step1');
    expect(schema.stepSchema.getStepStatus('step1')).toBe('resolved');
  });

  it('supports factory instances and per-instance overrides', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: async () => ({
          title: 'Loaded',
          fields: { name: { defaultValue: '' } },
        }),
      },
    }).configure();
    const form = createForm().withOverrides({
      step1: async () => ({ name: 'override' }),
    });
    await form.stepSchema.resolveStep('step1');
    expect(form.stepSchema.value.step1.fields.name.defaultValue).toBe(
      'override',
    );
  });
  it('keeps persisted values while restoring loader metadata and reset defaults', async () => {
    const store = createMockStorage();
    const definition = defineMultiStepForm({
      steps: {
        step1: async () => ({
          title: 'Loaded',
          fields: { name: { defaultValue: 'initial', label: 'Name' } },
        }),
      },
    });
    const storageOptions = {
      storage: { key: 'async', store, configure: { instances: ['default' as const] } },
    };
    const first = definition.configure(storageOptions)();
    await first.stepSchema.resolveStep('step1');
    first.stepSchema.value.step1.update({
      fields: ['fields.name.defaultValue'],
      updater: () => 'saved',
    });
    const second = definition.configure(storageOptions)();
    expect(second).not.toBe(first);
    await second.stepSchema.resolveStep('step1');
    expect(second.stepSchema.value.step1.fields.name.defaultValue).toBe(
      'saved',
    );
    expect(second.stepSchema.value.step1.fields.name.label).toBe('Name');
    second.stepSchema.value.step1.reset({ fields: 'all' });
    expect(second.stepSchema.value.step1.fields.name.defaultValue).toBe(
      'initial',
    );
  });
});
