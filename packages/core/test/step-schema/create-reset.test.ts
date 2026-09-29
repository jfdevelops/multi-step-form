import { describe, expect, it } from 'vitest';
import { createReset, defineMultiStepForm, reset } from '../../src';

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

describe('createReset', () => {
  it('exposes the same step scope from the step and forStep', () => {
    const schema = createSchema();
    const step = schema.stepSchema.value.step1;

    expect(createReset.forStep(step)).toBe(step.createReset);
    expect(reset.forStep(step)).toBe(step.createReset);
  });

  it('creates reusable field-scoped resetters', () => {
    const schema = createSchema();
    const step = schema.stepSchema.value.step1;
    const resetConsent = step.createReset.forFields([
      'fields.consent.defaultValue',
    ]);

    step.createUpdate.patch({
      fields: ['fields.consent.defaultValue'],
    })({ promptOpen: true });

    expect(step.fields.consent.defaultValue.promptOpen).toBe(false);
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue.promptOpen,
    ).toBe(true);
    expect(resetConsent()).toEqual({ executed: true });
    expect(
      schema.stepSchema.value.step1.fields.consent.defaultValue,
    ).toEqual({ promptOpen: false, resolvedFor: '' });
  });

  it('exports the same strongly typed root reset API', () => {
    const schema = createSchema();

    schema.stepSchema.value.step1.createUpdate.patch({
      fields: ['fields.email.defaultValue'],
    })('test@example.com');

    expect(
      reset({
        step: schema.stepSchema.value.step1,
        fields: ['fields.email.defaultValue'],
      }),
    ).toEqual({ executed: true });
    expect(schema.stepSchema.value.step1.fields.email.defaultValue).toBe('');
  });

  it('supports reusable and invocation-specific reset conditions', () => {
    const schema = createSchema();
    const step = schema.stepSchema.value.step1;
    const resetConsent = step.createReset.forFields([
      'fields.consent.defaultValue',
    ]);
    const isOpen = resetConsent.createCondition(
      ({ current }) => current.promptOpen,
    );
    const conditionalReset = resetConsent.withConditions([isOpen]);

    expect(conditionalReset()).toEqual({
      executed: false,
      reason: 'condition-failed',
    });

    step.createUpdate.patch({
      fields: ['fields.consent.defaultValue'],
    })({ promptOpen: true });

    expect(
      resetConsent.forConditions(
        {
          and: [
            isOpen,
            {
              or: [false, true],
            },
          ],
        },
      ),
    ).toEqual({ executed: true });
  });

  it('preserves inherited conditions when changing field scopes', () => {
    const schema = createSchema();
    const step = schema.stepSchema.value.step1;
    const conditionalReset = step.createReset
      .withConditions([false])
      .forFields(['fields.email.defaultValue']);

    step.createUpdate.patch({
      fields: ['fields.email.defaultValue'],
    })('test@example.com');

    expect(conditionalReset()).toEqual({
      executed: false,
      reason: 'condition-failed',
    });
    expect(schema.stepSchema.value.step1.fields.email.defaultValue).toBe(
      'test@example.com',
    );
  });
});
