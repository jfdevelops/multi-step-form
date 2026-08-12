import { describe, expect, it, vi } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('multi step form step schema: overrides', () => {
  it('applies default overrides to every instance and preserves them beside instance overrides', async () => {
    const pretendServer = {
      getSharedName: vi.fn(async () => ({ firstName: 'Server default' })),
      getSharedAge: vi.fn(async () => ({ age: 42 })),
      getClientName: vi.fn(async () => ({ firstName: 'Client' })),
    };
    const createForm = defineMultiStepForm({
      instances: ['client', 'admin'],
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
        },
        step2: {
          title: 'Step 2',
          fields: { age: { defaultValue: 0 } },
        },
      },
    }).configure({
      defaultOverrides: {
        step1: async () => pretendServer.getSharedName(),
        step2: async () => pretendServer.getSharedAge(),
      },
    });
    const client = createForm({ instance: 'client' }).withOverrides({
      step1: async () => pretendServer.getClientName(),
    });
    const admin = createForm({ instance: 'admin' });

    await vi.waitFor(() => {
      expect(client.stepSchema.getValue('step1', 'firstName')).toBe('Client');
      expect(client.stepSchema.getValue('step2', 'age')).toBe(42);
      expect(admin.stepSchema.getValue('step1', 'firstName')).toBe(
        'Server default',
      );
      expect(admin.stepSchema.getValue('step2', 'age')).toBe(42);
    });
    expect(pretendServer.getSharedName).toHaveBeenCalledTimes(1);
    expect(pretendServer.getSharedAge).toHaveBeenCalledTimes(2);
    expect(pretendServer.getClientName).toHaveBeenCalledTimes(1);
  });

  it('creates and automatically runs typed value overrides from the core factory', async () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            profile: {
              defaultValue: { name: 'Taylor', active: false },
              type: 'object.profile',
            },
          },
        },
      },
    }).configure();
    const override = createForm.createValueOverride({
      step: 'step1',
      values: ({ fields }) => ({
        profile: {
          name: fields.profile.defaultValue.name,
          active: true,
        },
      }),
    });
    const schema = createForm().withOverrides({ step1: override });

    await vi.waitFor(() => {
      expect(schema.stepSchema.getValue('step1', 'profile')).toEqual({
        name: 'Taylor',
        active: true,
      });
    });
  });

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

    expect(schema.stepSchema.getStepStatus('step1')).toBe('loading');
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
