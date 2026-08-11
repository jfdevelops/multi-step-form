import { describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src/';

describe('multi step form step schema', () => {
  it('should create a valid step schema', () => {
    const schema = defineMultiStepForm({
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
    }).configure()();

    expect(schema.stepSchema.value).toMatchObject({
      step1: {
        title: 'Step 1',
        nameTransformCasing: 'title',
        fields: {
          firstName: {
            defaultValue: '',
            nameTransformCasing: 'title',
            name: 'firstName',
            label: 'First Name',
          },
        },
      },
    });
  });

  it('should return the data for the specified step', () => {
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
    const step2 = schema.stepSchema.get({
      step: 'step2',
    });

    expect(step2).toMatchObject({
      step: 'step2',
      data: {
        title: 'Step 2',
        nameTransformCasing: 'title',
        fields: {
          lastName: {
            nameTransformCasing: 'title',
            defaultValue: '',
            name: 'lastName',
            label: 'Last Name',
          },
        },
      },
    });
  });
});
