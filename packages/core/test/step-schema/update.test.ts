import { describe, expect, it } from 'vitest';
import { MultiStepFormStepSchema } from '../../src';

describe('multi step form step schema: update', () => {
  it("should update the target step using the classes' update method", () => {
    const stepSchema = new MultiStepFormStepSchema({
      step1: {
        fields: [
          {
            name: 'firstName' as const,
            defaultValue: '',
            nameTransformCasing: 'camel',
          },
        ],
        title: 'Step 1',
      },
      step2: {
        fields: [
          {
            name: 'lastName' as const,
            defaultValue: '',
          },
        ],
        title: 'Step 2',
      },
      step3: {
        title: 'Step 3',
        fields: [
          {
            name: 'age' as const,
            defaultValue: 25,
          },
        ],
      },
    });

    expect(stepSchema.value.step1.nameTransformCasing).toBe('title');

    stepSchema.update(1, (data) => ({
      ...data,
      nameTransformCasing: 'camel',
    }));

    expect(stepSchema.value.step1.nameTransformCasing).toBe('camel');
  });

  it("should update target step using the step's update method", () => {
    const stepSchema = new MultiStepFormStepSchema({
      step1: {
        fields: [
          {
            name: 'firstName' as const,
            defaultValue: '',
            nameTransformCasing: 'camel',
          },
        ],
        title: 'Step 1',
      },
      step2: {
        fields: [
          {
            name: 'lastName' as const,
            defaultValue: '',
          },
        ],
        title: 'Step 2',
      },
      step3: {
        title: 'Step 3',
        fields: [
          {
            name: 'age' as const,
            defaultValue: 25,
          },
        ],
      },
    });

    expect(stepSchema.value.step2.title).toBe('Step 2');

    stepSchema.value.step2.update('title', 'Step 2 Updated');

    expect(stepSchema.value.step2.title).toBe('Step 2 Updated');
  });
});
