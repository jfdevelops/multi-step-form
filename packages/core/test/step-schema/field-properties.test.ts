import { describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

describe('multi step form step schema: field properties', () => {
  it('resolves the standard field properties for string fields', () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          nameTransformCasing: 'kebab',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
              label: 'Your first name',
            },
            lastName: {
              defaultValue: 'Swift',
            },
          },
        },
      },
    });

    expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
      name: 'firstName',
      defaultValue: 'Taylor',
      label: 'Your first name',
      nameTransformCasing: 'kebab',
    });

    expect(schema.stepSchema.value.step1.fields.lastName).toStrictEqual({
      name: 'lastName',
      defaultValue: 'Swift',
      label: 'last-name',
      nameTransformCasing: 'kebab',
    });
  });

  it('omits a disabled label', () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
              label: false,
            },
          },
        },
      },
    });

    expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
      name: 'firstName',
      defaultValue: 'Taylor',
      nameTransformCasing: 'title',
    });
    expect(schema.stepSchema.value.step1.fields.firstName).not.toHaveProperty(
      'label',
    );
  });

  it('resolves the type property for date fields', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            createdAt: {
              defaultValue: date,
            },
            startDate: {
              defaultValue: date,
              type: 'string',
            },
          },
        },
      },
    });

    expect(schema.stepSchema.value.step1.fields.createdAt).toStrictEqual({
      name: 'createdAt',
      defaultValue: date,
      label: 'Created At',
      nameTransformCasing: 'title',
      type: 'date',
    });

    expect(schema.stepSchema.value.step1.fields.startDate).toStrictEqual({
      name: 'startDate',
      defaultValue: JSON.stringify(date),
      label: 'Start Date',
      nameTransformCasing: 'title',
      type: 'string',
    });
  });
});
