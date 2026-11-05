import { instantiateSteps } from '@/steps/steps';
import { describe, expect, it } from 'vitest';

describe('createStep', () => {
  it('should create a step with the default type for the field', () => {
    const steps = instantiateSteps({
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
          title: 'Step 1',
        },
      },
    });

    expect(steps).toStrictEqual({
      step1: {
        fields: {
          firstName: {
            defaultValue: '',
            label: 'First Name',
            nameTransformCasing: 'title',
            name: 'firstName',
            isRequired: false,
          },
        },
        title: 'Step 1',
        isComplete: true,
        nameTransformCasing: 'title',
      },
    });
  });

  it('should create a step with the type for the field if provided', () => {
    const now = new Date();
    const steps = instantiateSteps({
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: now,
              type: 'string',
            },
          },
          title: 'Step 1',
        },
      },
    });

    expect(steps).toStrictEqual({
      step1: {
        fields: {
          firstName: {
            defaultValue: JSON.stringify(now),
            label: 'First Name',
            nameTransformCasing: 'title',
            type: 'string',
            name: 'firstName',
            isRequired: false,
          },
        },
        title: 'Step 1',
        isComplete: true,
        nameTransformCasing: 'title',
      },
    });
  });
});
