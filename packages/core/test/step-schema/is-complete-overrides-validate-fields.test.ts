import { type } from 'arktype';
import { expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

it('prefers isComplete over validateFields', () => {
  const instance = defineMultiStepForm({
    steps: {
      step1: {
        title: 'Step 1',
        fields: { firstName: { defaultValue: '' } },
        validateFields: type({ firstName: 'string > 0' }),
        isComplete: () => true,
      },
    },
  }).configure()();

  expect(instance.stepSchema.isStepComplete('step1')).toBe(true);
});
