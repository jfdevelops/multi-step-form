import { describe, expect, it } from 'vitest';
import { type } from 'arktype';
import { defineMultiStepForm } from '../../src';

describe('multi step form step schema: field validation', () => {
  it('should validate fields for a step', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Validated Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            lastName: {
              defaultValue: '',
            },
          },
          validateFields: type({
            firstName: 'string',
            lastName: 'string',
          }),
        },
      },
    }).configure()();

    expect(schema.stepSchema.value.step1).toMatchObject({
      title: 'Validated Step 1',
      nameTransformCasing: 'title',
      fields: {
        firstName: {
          defaultValue: '',
          name: 'firstName',
          nameTransformCasing: 'title',
          label: 'First Name',
        },
        lastName: {
          defaultValue: '',
          name: 'lastName',
          nameTransformCasing: 'title',
          label: 'Last Name',
        },
      },
    });
  });

  it('should error if validated fields differ from config fields', () => {
    expect(
      // This function is needed so that vitest can intercept the value
      () =>
        defineMultiStepForm({
          steps: {
            step1: {
              title: 'Validated Step 1',
              fields: {
                firstName: {
                  defaultValue: '',
                },
                lastName: {
                  defaultValue: '',
                },
              },
              validateFields: type({
                fName: 'string',
                lName: 'string',
              }),
            },
          },
        }).configure()()
    ).toThrowError(Error);
  });
});
