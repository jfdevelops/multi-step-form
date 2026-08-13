import { type } from 'arktype';
import { describe, expectTypeOf, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('step validate types', () => {
  it('is absent when validateFields is not configured', () => {
    const instance = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
        },
      },
    }).configure()();

    // @ts-expect-error validate exists only when validateFields is provided
    instance.stepSchema.value.step1.validate;
  });

  it('is a function when validateFields is configured', () => {
    const instance = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: { firstName: { defaultValue: '' } },
          validateFields: type({ firstName: 'string' }),
        },
      },
    }).configure()();

    expectTypeOf(instance.stepSchema.value.step1.validate).toBeFunction();
  });
});
