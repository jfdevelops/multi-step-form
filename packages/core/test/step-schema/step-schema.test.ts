import { describe, expect, it } from 'vitest';
import { MultiStepFormStepSchema } from '../../src/step-schema.ts.ts';

describe('multi step form step schema', () => {
  it('should create a valid step schema', () => {
    const stepSchema = new MultiStepFormStepSchema({
      step1: {
        fields: [
          {
            name: 'firstName' as const,
            defaultValue: '',
          },
        ],
        title: 'Step 1',
      },
    });

    expect(stepSchema.value).toMatchObject({
      step1: {
        title: 'Step 1',
        nameTransformCasing: 'title',
        fields: {
          firstName: {
            defaultValue: '',
            nameTransformCasing: 'title',
            type: 'string',
            label: 'First Name',
          },
        },
      },
    });
  });

  it('should return the data for the first step', () => {
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
    });
    const step1 = stepSchema.first();

    expect(step1).toMatchObject({
      step: 1,
      data: {
        title: 'Step 1',
        nameTransformCasing: 'title',
        fields: {
          firstName: {
            nameTransformCasing: 'camel',
            defaultValue: '',
            type: 'string',
            label: 'firstName',
          },
        },
      },
    });
  });

  it('should return the data for the last step', () => {
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
    });
    const step2 = stepSchema.last();

    expect(step2).toMatchObject({
      step: 2,
      data: {
        title: 'Step 2',
        nameTransformCasing: 'title',
        fields: {
          lastName: {
            nameTransformCasing: 'title',
            defaultValue: '',
            type: 'string',
            label: 'Last Name',
          },
        },
      },
    });
  });

  it('should return the data for the specified step', () => {
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
    const step2 = stepSchema.get({ step: 2 });

    expect(step2).toMatchObject({
      step: 2,
      data: {
        title: 'Step 2',
        nameTransformCasing: 'title',
        fields: {
          lastName: {
            nameTransformCasing: 'title',
            defaultValue: '',
            type: 'string',
            label: 'Last Name',
          },
        },
      },
    });
  });
});
