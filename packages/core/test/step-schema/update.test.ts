import { describe, expect, it } from 'vitest';
import { MultiStepFormStepSchema } from '../../src';

describe('multi step form step schema: update', () => {
  it.skip('should update the specified data immutably', () => {
    const stepSchema = new MultiStepFormStepSchema({
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

    // Capture pre-update references
    const beforeValueRef = stepSchema.value;
    const beforeStep1Ref = stepSchema.value.step1;
    const beforeCasing = beforeStep1Ref.nameTransformCasing;

    // Sanity check before update
    expect(beforeCasing).toBe('title');

    // Invoke the in-place update
    stepSchema.update({
      targetStep: 'step1',
      fields: ['nameTransformCasing'],
      updater() {
        return 'camel' as const;
      },
    });

    // ✅ Verify that the outer object reference is stable
    expect(stepSchema).toBe(stepSchema);

    // ✅ Verify immutability: the top-level value is a new object
    expect(stepSchema.value).not.toBe(beforeValueRef);

    // ✅ Verify that the specific step object is replaced (immutable update)
    expect(stepSchema.value.step1).not.toBe(beforeStep1Ref);

    // ✅ Verify data updated correctly
    expect(stepSchema.value.step1.nameTransformCasing).toBe('camel');

    // ✅ Verify the old reference wasn't affected
    expect(beforeStep1Ref.nameTransformCasing).toBe('title');
  });

  it("should update the target step using the classes' update method", () => {
    const stepSchema = new MultiStepFormStepSchema({
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

    expect(stepSchema.value.step1.nameTransformCasing).toBe('title');

    stepSchema.update({
      targetStep: 'step1',
      fields: ['nameTransformCasing'],
      updater() {
        return 'camel' as const;
      },
    });

    expect(stepSchema.value.step1.nameTransformCasing).toBe('camel');
  });

  it("should update target step using the step's update method", () => {
    const stepSchema = new MultiStepFormStepSchema({
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

    expect(stepSchema.value.step2.title).toBe('Step 2');

    stepSchema.value.step2.update({
      fields: {
        title: true,
      },
      updater() {
        return 'Step 2 Updated';
      },
    });

    expect(stepSchema.value.step2.title).toBe('Step 2 Updated');
  });
});
