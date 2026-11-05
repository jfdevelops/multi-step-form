import { type } from 'arktype';
import { expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

it('returns the current Standard Schema validation result', () => {
  const instance = defineMultiStepForm({
    steps: {
      step1: {
        title: 'Step 1',
        fields: { firstName: { defaultValue: '' } },
        validateFields: type({ firstName: 'string > 0' }),
      },
    },
  }).configure()();

  const invalidResult = instance.stepSchema.value.step1.validate();

  expect(invalidResult.success).toBe(false);
  if (!invalidResult.success) {
    expect(invalidResult.issues.length).toBeGreaterThan(0);
  }

  instance.stepSchema.update({
    targetStep: 'step1',
    fields: ['fields.firstName.defaultValue'],
    updater: 'Taylor',
  });

  expect(instance.stepSchema.value.step1.validate()).toEqual({
    success: true,
    value: { firstName: 'Taylor' },
  });
});
