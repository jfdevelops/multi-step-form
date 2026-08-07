import { describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

describe('react: multi step form schema update', () => {
  it("should updated the target step using the class's update method", () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          },
          title: 'Step 1',
        },
        step2: {
          fields: {
            lastName: {
              defaultValue: '',
            },
          },
          title: 'Step 2',
        },
        step3: {
          title: 'Step 3',
          fields: {
            age: {
              defaultValue: 25,
            },
          },
        },
      },
    });
    const { stepSchema } = schema;

    expect(stepSchema.value.step1.nameTransformCasing).toBe('title');

    stepSchema.update({
      targetStep: 'step1',
      fields: ['nameTransformCasing'],
      updater() {
        return 'camel' as const;
      },
    } as never);

    expect(stepSchema.value.step1.nameTransformCasing).toBe('camel');
  });
});
