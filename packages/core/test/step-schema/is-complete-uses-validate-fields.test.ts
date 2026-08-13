import { type } from 'arktype';
import { expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

it('uses validateFields to determine default step completeness', () => {
  const instance = defineMultiStepForm({
    steps: {
      step1: {
        title: 'Step 1',
        fields: { firstName: { defaultValue: '' } },
        validateFields: type({ firstName: 'string > 0' }),
      },
    },
  }).configure()();

  expect(instance.stepSchema.isStepComplete('step1')).toBe(false);
  expect(instance.stepSchema.value.step1.isComplete).toBe(false);

  instance.stepSchema.update({
    targetStep: 'step1',
    fields: ['fields.firstName.defaultValue'],
    updater: 'Taylor',
  });

  expect(instance.stepSchema.isStepComplete('step1')).toBe(true);
  expect(instance.stepSchema.value.step1.isComplete).toBe(true);
});
