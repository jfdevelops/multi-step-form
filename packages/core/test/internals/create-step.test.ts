import { createStep } from '@/internals/utils';
import { describe, it, expect } from 'vitest';

describe('createStep', () => {
  it('should create a step with the default type for the field', () => {
    const step = createStep({
      step1: {
        fields: {
          firstName: {
            defaultValue: '',
          },
        },
        title: 'Step 1',
      },
    });

    expect(step).toStrictEqual({
      step1: {
        fields: {
          firstName: {
            defaultValue: '',
            label: 'First Name',
            nameTransformCasing: 'title',
            type: 'string',
          },
        },
        title: 'Step 1',
        nameTransformCasing: 'title',
      },
    });
  });

  it('should create a step with the type for the field if provided', () => {
    const now = new Date();
    const step = createStep({
      step1: {
        fields: {
          firstName: {
            defaultValue: now,
            type: 'string',
          },
        },
        title: 'Step 1',
      },
    });

    expect(step).toStrictEqual({
      step1: {
        fields: {
          firstName: {
            defaultValue: now,
            type: 'string',
            label: 'First Name',
            nameTransformCasing: 'title',
          },
        },
        title: 'Step 1',
        nameTransformCasing: 'title',
      },
    });
  });
});
