import { describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('multi step form step schema: field properties', () => {
  it('resolves the standard field properties for string fields', () => {
    const schema = defineMultiStepForm({
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
    }).configure()();

    expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
      name: 'firstName',
      defaultValue: 'Taylor',
      label: 'Your first name',
      nameTransformCasing: 'kebab',
      isRequired: false,
    });

    expect(schema.stepSchema.value.step1.fields.lastName).toStrictEqual({
      name: 'lastName',
      defaultValue: 'Swift',
      label: 'last-name',
      nameTransformCasing: 'kebab',
      isRequired: false,
    });
  });

  it('omits a disabled label', () => {
    const schema = defineMultiStepForm({
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
    }).configure()();

    expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
      name: 'firstName',
      defaultValue: 'Taylor',
      nameTransformCasing: 'title',
      isRequired: false,
    });
    expect(schema.stepSchema.value.step1.fields.firstName).not.toHaveProperty(
      'label',
    );
  });

  it('resolves the type property for date fields', () => {
    const date = new Date('2024-01-01T00:00:00.000Z');
    const schema = defineMultiStepForm({
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
    }).configure()();

    expect(schema.stepSchema.value.step1.fields.createdAt).toStrictEqual({
      name: 'createdAt',
      defaultValue: date,
      label: 'Created At',
      nameTransformCasing: 'title',
      type: 'date',
      isRequired: false,
    });

    expect(schema.stepSchema.value.step1.fields.startDate).toStrictEqual({
      name: 'startDate',
      defaultValue: JSON.stringify(date),
      label: 'Start Date',
      nameTransformCasing: 'title',
      type: 'string',
      isRequired: false,
    });
  });
});
