import { describe, expectTypeOf, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('steps.as("string.keys") with typed isComplete', () => {
  it('keeps step key union when isComplete predicates are typed', () => {
    const instance = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: { defaultValue: '' },
          },
          isComplete: (values: { firstName: string }) =>
            values.firstName.length > 0,
        },
        step2: {
          title: 'Step 2',
          fields: {
            age: { defaultValue: 0 },
          },
          isComplete: (values: { age: number }) => values.age > 0,
        },
      },
    }).configure()();

    expectTypeOf(
      instance.stepSchema.steps.as('string.keys').parse,
    ).returns.toEqualTypeOf<'step1' | 'step2'>();
    expectTypeOf(instance.stepSchema.steps.value).toEqualTypeOf<
      readonly ('step1' | 'step2')[]
    >();
  });

  it('keeps step key union when isComplete is omitted', () => {
    const instance = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: { defaultValue: '' },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            age: { defaultValue: 0 },
          },
        },
      },
    }).configure()();

    expectTypeOf(
      instance.stepSchema.steps.as('string.keys').parse,
    ).returns.toEqualTypeOf<'step1' | 'step2'>();
    expectTypeOf(instance.stepSchema.steps.value).toEqualTypeOf<
      readonly ('step1' | 'step2')[]
    >();
  });
});
