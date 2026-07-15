import { describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';
import { titleCreator } from '../utils/title-creator';

describe('multi step form step schema: reset', () => {
  // Note: this test needs to be first otherwise `schema` will be from a different test
  it('should reset all the fields', () => {
    const title = titleCreator('reset:all');
    const schema = createMultiStepFormSchema({
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          },
          title: title('Step 1'),
        },
      },
    });

    schema.stepSchema.value.step1.update({
      updater: ({ ctx }) => {
        const { fields, ...rest } = ctx.step1;

        return {
          ...rest,
          fields: {
            ...fields,
            firstName: {
              ...fields.firstName,
              defaultValue: 'Updated',
            },
          },
          title: 'Updated Title',
        };
      },
    });

    expect(schema.stepSchema.value.step1).toStrictEqual(
      expect.objectContaining({
        fields: {
          firstName: {
            defaultValue: 'Updated',
            nameTransformCasing: 'camel',
            label: 'firstName',
            name: 'firstName',
          },
        },
        title: 'Updated Title',
        nameTransformCasing: 'title',
      })
    );

    schema.stepSchema.value.step1.reset();
    expect(schema.stepSchema.value.step1).toStrictEqual(
      expect.objectContaining({
        fields: {
          firstName: {
            defaultValue: '',
            nameTransformCasing: 'camel',
            label: 'firstName',
            name: 'firstName',
          },
        },
        title: title('Step 1'),
        nameTransformCasing: 'title',
      })
    );
  });

  it('resets async steps from resolved definitions', async () => {
    const schema = createMultiStepFormSchema({
      steps: {
        step1: async () => ({
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: 'Taylor',
            },
          },
        }),
      },
    });

    await schema.stepSchema.resolveStep('step1');
    schema.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Jordan',
    });

    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      'Jordan',
    );

    expect(() => schema.stepSchema.value.step1.reset()).not.toThrow();
    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      'Taylor',
    );
  });

  describe('tuple notation', () => {
    it('should reset the specified field', () => {
      const schema = createMultiStepFormSchema({
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
      });

      schema.stepSchema.value.step1.update({
        fields: ['fields.firstName.defaultValue'],
        updater: 'Updated',
      });
      expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
        'Updated'
      );

      schema.stepSchema.value.step1.reset({
        fields: ['fields.firstName.defaultValue'],
      });
      expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
        ''
      );
    });

    it('should reset the specified fields', () => {
      const schema = createMultiStepFormSchema({
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
      });

      schema.stepSchema.value.step1.update({
        fields: ['fields.firstName'],
        updater: ({ ctx }) => {
          const { firstName } = ctx.step1.fields;

          return {
            ...firstName,
            defaultValue: 'Updated',
            nameTransformCasing: 'flat',
          };
        },
      });
      expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: 'Updated',
        nameTransformCasing: 'flat',
        name: 'firstName',
        label: 'firstName',
      });

      schema.stepSchema.value.step1.reset({
        fields: ['fields.firstName'],
      });
      expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: '',
        nameTransformCasing: 'camel',
        name: 'firstName',
        label: 'firstName',
      });
    });
  });

  describe('object notation', () => {
    it('should reset the specified field', () => {
      const title = titleCreator('reset:object-notation:field');
      const schema = createMultiStepFormSchema({
        steps: {
          step1: {
            fields: {
              firstName: {
                defaultValue: '',
                nameTransformCasing: 'camel',
              },
            },
            title: title('Step 1'),
          },
        },
      });

      schema.stepSchema.value.step1.update({
        fields: {
          fields: {
            firstName: {
              defaultValue: true,
            },
          },
        },
        updater: 'Updated',
      });
      expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
        'Updated'
      );

      schema.stepSchema.value.step1.reset({
        fields: {
          fields: {
            firstName: {
              defaultValue: true,
            },
          },
        },
      });
      expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
        ''
      );
    });

    it('should reset the specified fields', () => {
      const title = titleCreator('reset:object-notation:fields');
      const schema = createMultiStepFormSchema({
        steps: {
          step1: {
            fields: {
              firstName: {
                defaultValue: '',
                nameTransformCasing: 'camel',
              },
            },
            title: title('Step 1'),
          },
          step2: {
            fields: {
              lastName: {
                defaultValue: '',
              },
            },
            title: title('Step 2'),
          },
          step3: {
            title: title('Step 3'),
            fields: {
              age: {
                defaultValue: 25,
              },
            },
          },
        },
      });

      schema.stepSchema.value.step1.update({
        fields: {
          fields: {
            firstName: true,
          },
        },
        updater: ({ ctx }) => {
          const { firstName } = ctx.step1.fields;

          return {
            ...firstName,
            defaultValue: 'Updated',
          };
        },
      });
      expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: 'Updated',
        nameTransformCasing: 'camel',
        name: 'firstName',
        label: 'firstName',
      });

      schema.stepSchema.value.step1.reset({
        fields: {
          fields: {
            firstName: true,
          },
        },
      });
      expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: '',
        nameTransformCasing: 'camel',
        name: 'firstName',
        label: 'firstName',
      });
    });
  });
});
