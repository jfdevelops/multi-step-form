import { describe, expect, expectTypeOf, it } from 'vitest';
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
      .withInput<{
        checkedKey: string;
        isSettled: boolean;
        patch: Partial<{
          promptOpen: boolean;
          resolvedFor: string;
        }>;
      }>();
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
});
