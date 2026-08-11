import { describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('react: multi step form schema update', () => {
  it("should updated the target step using the class's update method", () => {
    const schema = defineMultiStepForm({
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
    }).configure()();
    const { stepSchema } = schema;

    expect(stepSchema.value.step1.nameTransformCasing).toBe('title');

    stepSchema.value.step1.update({
      fields: ['nameTransformCasing'],
      updater() {
        return 'camel' as const;
      },
    });

    expect(stepSchema.value.step1.nameTransformCasing).toBe('camel');
  });
});
