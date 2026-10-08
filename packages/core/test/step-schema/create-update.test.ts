import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { type } from 'arktype';
import { createUpdate, defineMultiStepForm, update } from '../../src';

function createSchema() {
  return defineMultiStepForm({
    steps: {
      step1: {
        fields: {
          consent: {
            defaultValue: {
              promptOpen: false,
              resolvedFor: '',
            },
          },
          email: { defaultValue: '' },
        },
        title: 'Step 1',
      },
    },
  }).configure()();
}

describe('createUpdate', () => {
  it('exposes the same step scope from the step and forStep', () => {
    const schema = createSchema();
    const step = schema.stepSchema.value.step1;

    expect(createUpdate.forStep(step)).toBe(step.createUpdate);
    expect(update.forStep(step)).toBe(step.createUpdate);
  });

  it('patches the latest selected object value', () => {
    const schema = createSchema();
    const patchConsent = schema.stepSchema.value.step1.createUpdate.patch({
      fields: ['fields.consent.defaultValue'],
    });

    expect(patchConsent({ promptOpen: true })).toEqual({ executed: true });
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue,
    ).toEqual({ promptOpen: true, resolvedFor: '' });

    patchConsent({ resolvedFor: 'email:test@example.com' });

    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue,
    ).toEqual({
      promptOpen: true,
      resolvedFor: 'email:test@example.com',
    });
  });

  it('exports the same strongly typed root patch API', () => {
    const schema = createSchema();
    const patchConsent = update.patch({
      step: schema.stepSchema.value.step1,
      fields: ['fields.consent.defaultValue'],
    });

    expect(patchConsent({ promptOpen: true })).toEqual({ executed: true });
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue.promptOpen,
    ).toBe(true);
  });

  it('supports field and input scopes with strongly typed conditions', () => {
    const schema = createSchema();
    const consentUpdate = schema.stepSchema.value.step1.createUpdate
      .forFields(['fields.consent.defaultValue'])
      .withInput(
        type({
          checkedKey: 'string',
          isSettled: 'boolean',
          patch: {
            'promptOpen?': 'boolean',
            'resolvedFor?': 'string',
          },
        }),
      );
    const isSettled = consentUpdate.createCondition(
      ({ input }) => input.isSettled,
    );
    const isUnresolved = consentUpdate.createCondition(
      ({ current, input }) => current.resolvedFor !== input.checkedKey,
    );
    const reconcileConsent = consentUpdate.patch({
      conditions: [isSettled, isUnresolved],
      patch: ({ input }) => input.patch,
    });
    const listener = vi.fn();
    const unsubscribe = schema.stepSchema.subscribe(listener);

    expectTypeOf(isSettled).parameter(0).toMatchTypeOf<{
      input: {
        checkedKey: string;
        isSettled: boolean;
        patch: Partial<{
          promptOpen: boolean;
          resolvedFor: string;
        }>;
      };
    }>();

    expect(
      reconcileConsent({
        checkedKey: 'email:test@example.com',
        isSettled: false,
        patch: { promptOpen: true },
      }),
    ).toEqual({ executed: false, reason: 'condition-failed' });
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue.promptOpen,
    ).toBe(false);
    expect(listener).not.toHaveBeenCalled();

    expect(
      reconcileConsent({
        checkedKey: 'email:test@example.com',
        isSettled: true,
        patch: { promptOpen: true },
      }),
    ).toEqual({ executed: true });
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue.promptOpen,
    ).toBe(true);
    expect(listener).toHaveBeenCalledOnce();

    expect(() =>
      reconcileConsent({
        checkedKey: 'email:test@example.com',
        isSettled: 'yes' as never,
        patch: { promptOpen: false },
      }),
    ).toThrow();
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue.promptOpen,
    ).toBe(true);
    unsubscribe();
  });

  it('accepts recursive invocation conditions without returning a thunk', () => {
    const schema = createSchema();
    const patchConsent = schema.stepSchema.value.step1.createUpdate.patch({
      fields: ['fields.consent.defaultValue'],
    });

    expect(
      patchConsent.forConditions(
        {
          and: [
            true,
            {
              or: [false, true],
            },
          ],
        },
        { promptOpen: true },
      ),
    ).toEqual({ executed: true });
  });

  it('defers an update until the prepared callback is invoked', () => {
    const schema = createSchema();
    const patchConsent = schema.stepSchema.value.step1.createUpdate.patch({
      fields: ['fields.consent.defaultValue'],
    });
    const openPrompt = patchConsent.deferExecution({ promptOpen: true });

    expectTypeOf(openPrompt).toEqualTypeOf<
      () => ReturnType<typeof patchConsent>
    >();
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue.promptOpen,
    ).toBe(false);

    patchConsent({ resolvedFor: 'latest' });

    expect(openPrompt()).toEqual({ executed: true });
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue,
    ).toEqual({ promptOpen: true, resolvedFor: 'latest' });
  });

  it('accepts a custom input validator function', () => {
    const schema = createSchema();
    const validateInput = vi.fn((input: { promptOpen: boolean }) => {
      if (typeof input.promptOpen !== 'boolean') {
        throw new TypeError('promptOpen must be a boolean');
      }

      return input;
    });
    const patchConsent = schema.stepSchema.value.step1.createUpdate
      .forFields(['fields.consent.defaultValue'])
      .withInput(validateInput)
      .patch();

    expect(patchConsent({ promptOpen: true })).toEqual({ executed: true });
    expect(validateInput).toHaveBeenCalledWith({ promptOpen: true });
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue.promptOpen,
    ).toBe(true);
    expect(() => patchConsent({ promptOpen: 'yes' as never })).toThrow(
      'promptOpen must be a boolean',
    );
  });

  it('accepts validator input while exposing transformed output', () => {
    const schema = createSchema();
    const updateEmail = schema.stepSchema.value.step1.createUpdate
      .forFields(['fields.email.defaultValue'])
      .withInput((input: string) => input.length)
      .bind({
        updater: ({ input }) => {
          expectTypeOf(input).toEqualTypeOf<number>();
          return String(input);
        },
      });

    expectTypeOf(updateEmail).parameter(0).toEqualTypeOf<string>();
    expect(updateEmail('validated input')).toEqual({ executed: true });
    expect(schema.stepSchema.value.step1.fields.email.defaultValue).toBe('15');
  });
});
