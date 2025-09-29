import { describe, expect, it } from 'vitest';
import { type } from 'arktype';
import { MultiStepFormStepSchema } from '../../src';

describe('multi step form step schema: field validation', () => {
  it('should validate fields for a step', () => {
    const stepSchema = new MultiStepFormStepSchema({
      step1: {
        title: 'Validated Step 1',
        fields: [
          {
            name: 'firstName' as const,
            defaultValue: '',
          },
          {
            name: 'lastName' as const,
            defaultValue: '',
          },
        ],
        validateFields: type({
          firstName: 'string',
          lastName: 'string',
        }),
      },
    });

    expect(stepSchema.first()).toMatchObject({
      step: 1,
      data: {
        title: 'Validated Step 1',
        nameTransformCasing: 'title',
        fields: {
          firstName: {
            defaultValue: '',
            type: 'string',
            nameTransformCasing: 'title',
            label: 'First Name',
          },
          lastName: {
            defaultValue: '',
            type: 'string',
            nameTransformCasing: 'title',
            label: 'Last Name',
          },
        },
      },
    });
  });

  it('should error if validated fields differ from config fields', () => {
    expect(
      // This function is needed so that vitest can intercept the value
      () =>
        new MultiStepFormStepSchema({
          step1: {
            title: 'Validated Step 1',
            fields: [
              {
                name: 'firstName' as const,
                defaultValue: '',
              },
              {
                name: 'lastName' as const,
                defaultValue: '',
              },
            ],
            validateFields: type({
              fName: 'string',
              lName: 'string',
            }),
          },
        })
    ).toThrowError(Error);
  });
});
