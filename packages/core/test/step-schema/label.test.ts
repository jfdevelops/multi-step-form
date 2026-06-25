import { describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

describe('multi step form step schema: label', () => {
  it('should omit the label when set to false', () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'kebab',
          fields: {
            firstName: {
              defaultValue: '',
              label: false,
            },
          },
        },
      },
    });

    expect(schema.stepSchema.get({ step: 'step1' }).data.fields.firstName).not.toHaveProperty(
      'label'
    );
  });

  it('should have a default label when no label is specified', () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'kebab',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
      },
    });

    expect(
      schema.stepSchema.get({
        step: 'step1',
      }).data.fields.firstName.label
    ).toBe('first-name');
  });

  it('should have a custom label when specified', () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'kebab',
          fields: {
            firstName: {
              defaultValue: '',
              label: 'First Name',
            },
          },
        },
      },
    });

    expect(
      schema.stepSchema.get({
        step: 'step1',
      }).data.fields.firstName.label
    ).toBe('First Name');
  });
});
