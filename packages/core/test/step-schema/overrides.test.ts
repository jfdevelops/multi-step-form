import { describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('multi step form step schema: overrides', () => {
  it('resolves async overrides for a single step', async () => {
    const createForm = defineMultiStepForm({
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
            lastName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure();

    const schema = createForm().withOverrides({
      step1: async (data) => ({
        firstName: String(data.fields.firstName.defaultValue ?? ''),
      }),
    });

    expect(schema.stepSchema.getStepStatus('step1')).toBe('idle');
    expect(schema.stepSchema.getStepStatus('step2')).toBe('resolved');
    expect(schema.stepSchema.getValue('step1', 'firstName')).toBe('');

    schema.stepSchema.update({
      targetStep: 'step1',
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });

    await schema.stepSchema.resolveStep('step1');

    expect(schema.stepSchema.getStepStatus('step1')).toBe('resolved');
    expect(schema.stepSchema.getValue('step1', 'firstName')).toBe('Taylor');
  });

  it('stores override errors on the step status', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure();

    const schema = createForm().withOverrides({
      step1: async () => {
        throw new Error('Failed to load');
      },
    });

    await expect(schema.stepSchema.resolveStep('step1')).rejects.toThrow(
      'Failed to load',
    );
    expect(schema.stepSchema.getStepStatus('step1')).toBe('error');
    expect(schema.stepSchema.getStepError('step1')).toBeInstanceOf(Error);
  });

  it('stores synchronous override errors on the step status', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure();
    const overrideError = new Error('Failed before returning a promise');
    const schema = createForm().withOverrides({
      step1: () => {
        throw overrideError;
      },
    });

    await expect(schema.stepSchema.resolveStep('step1')).rejects.toBe(
      overrideError,
    );
    expect(schema.stepSchema.getStepStatus('step1')).toBe('error');
    expect(schema.stepSchema.getStepError('step1')).toBe(overrideError);
  });

  it('preserves untouched field defaults when overrides return a partial patch', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            saveToAccount: {
              defaultValue: false,
            },
          },
        },
      },
    }).configure();

    const schema = createForm().withOverrides({
      step1: async () => ({
        firstName: 'Taylor',
      }),
    });

    await schema.stepSchema.resolveStep('step1');

    expect(schema.stepSchema.getStepStatus('step1')).toBe('resolved');
    expect(schema.stepSchema.getValue('step1', 'firstName')).toBe('Taylor');
    expect(schema.stepSchema.getValue('step1', 'saveToAccount')).toBe(false);
    expect(schema.stepSchema.value.step1.fields.saveToAccount.defaultValue).toBe(
      false,
    );
  });
});
