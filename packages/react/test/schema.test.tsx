import { describe, expect, expectTypeOf, it } from 'vitest';
import { createMultiStepFormSchema } from '../src';

describe('createMultiStepFormSchema', () => {
  it('creates a react schema from fully sync step definitions', () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            age: {
              defaultValue: 0,
            },
          },
        },
      },
    });

    expect(schema.stepSchema.getStepStatus('step1')).toBe('resolved');
    expect(schema.stepSchema.getStepStatus('step2')).toBe('resolved');
    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe('');
    expect(schema.stepSchema.value.step2.fields.age.defaultValue).toBe(0);
    expect(typeof schema.stepSchema.value.step1.createComponent).toBe('function');
  });

  it('creates a react schema synchronously from fully async step definitions', async () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: async () => ({
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        }),
        step2: async () => ({
          title: 'Step 2',
          fields: {
            age: {
              defaultValue: 0,
            },
          },
        }),
      },
    });

    expect(schema.stepSchema.getStepStatus('step1')).toBe('idle');
    expect(schema.stepSchema.getStepStatus('step2')).toBe('idle');
    expect(typeof schema.stepSchema.value.step1.createComponent).toBe('function');

    const step1 = await schema.stepSchema.resolveStep('step1');
    const step2 = await schema.stepSchema.resolveStep('step2');

    expect(schema.stepSchema.getStepStatus('step1')).toBe('resolved');
    expect(schema.stepSchema.getStepStatus('step2')).toBe('resolved');
    expect(step1.fields.firstName.defaultValue).toBe('');
    expect(step2.fields.age.defaultValue).toBe(0);
    expectTypeOf(step1.fields.firstName.defaultValue).toEqualTypeOf<string>();
    expectTypeOf(step2.fields.age.defaultValue).toEqualTypeOf<number>();
  });

  it('creates a react schema synchronously from mixed sync and async step definitions', async () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
        step2: async () => ({
          title: 'Step 2',
          description: 'Resolved asynchronously',
          fields: {
            age: {
              defaultValue: 0,
            },
          },
        }),
      },
    });

    expect(schema.stepSchema.getStepStatus('step1')).toBe('resolved');
    expect(schema.stepSchema.getStepStatus('step2')).toBe('idle');
    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe('');
    expect(typeof schema.stepSchema.value.step2.createComponent).toBe('function');

    const step2 = await schema.stepSchema.resolveStep('step2');

    expect(schema.stepSchema.getStepStatus('step2')).toBe('resolved');
    expect(step2.fields.age.defaultValue).toBe(0);
    expect(step2.description).toBe('Resolved asynchronously');
    expect(typeof schema.stepSchema.value.step2.createComponent).toBe('function');
  });
});
