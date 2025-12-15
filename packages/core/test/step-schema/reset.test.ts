import { describe, expect, it } from 'vitest';
import { MultiStepFormStepSchema } from '../../src';
import { titleCreator } from '../utils/title-creator';


describe('multi step form step schema: reset', () => {
  // Note: this test needs to be first otherwise `stepSchema` will be from a different test
  it('should reset all the fields', () => {
    const title = titleCreator('reset:all');
    const stepSchema = new MultiStepFormStepSchema({
      steps: {
        step1: {
          fields: {
            firstName: {
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          },
          title: title('Step 1') as string,
        },
      },
    });

    stepSchema.value.step1.update({
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

    expect(stepSchema.value.step1).toStrictEqual(
      expect.objectContaining({
        fields: {
          firstName: {
            defaultValue: 'Updated',
            nameTransformCasing: 'camel',
            label: 'firstName',
            type: 'string',
          },
        },
        title: 'Updated Title',
        nameTransformCasing: 'title',
      })
    );

    stepSchema.value.step1.reset();
    expect(stepSchema.value.step1).toStrictEqual(
      expect.objectContaining({
        fields: {
          firstName: {
            defaultValue: '',
            nameTransformCasing: 'camel',
            label: 'firstName',
            type: 'string',
          },
        },
        title: title('Step 1'),
        nameTransformCasing: 'title',
      })
    );
  });

  describe('tuple notation', () => {
    it('should reset the specified field', () => {
      const stepSchema = new MultiStepFormStepSchema({
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

      stepSchema.value.step1.update({
        fields: ['fields.firstName.defaultValue'],
        updater: 'Updated',
      });
      expect(stepSchema.value.step1.fields.firstName.defaultValue).toBe(
        'Updated'
      );

      stepSchema.value.step1.reset({
        fields: ['fields.firstName.defaultValue'],
      });
      expect(stepSchema.value.step1.fields.firstName.defaultValue).toBe('');
    });

    it('should reset the specified fields', () => {
      const stepSchema = new MultiStepFormStepSchema({
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

      stepSchema.value.step1.update({
        fields: ['fields.firstName'],
        updater: ({ ctx }) => {
          const { firstName } = ctx.step1.fields;

          return {
            ...firstName,
            defaultValue: 'Updated',
            label: 'First Name Updated Label',
          };
        },
      });
      expect(stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: 'Updated',
        nameTransformCasing: 'camel',
        type: 'string',
        label: 'First Name Updated Label',
      });

      stepSchema.value.step1.reset({
        fields: ['fields.firstName'],
      });
      expect(stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: '',
        nameTransformCasing: 'camel',
        type: 'string',
        label: 'firstName',
      });
    });
  });

  describe('object notation', () => {
    it('should reset the specified field', () => {
      const title = titleCreator('reset:object-notation:field');
      const stepSchema = new MultiStepFormStepSchema({
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

      stepSchema.value.step1.update({
        fields: {
          fields: {
            firstName: {
              defaultValue: true,
            },
          },
        },
        updater: 'Updated',
      });
      expect(stepSchema.value.step1.fields.firstName.defaultValue).toBe(
        'Updated'
      );

      stepSchema.value.step1.reset({
        fields: {
          fields: {
            firstName: {
              defaultValue: true,
            },
          },
        },
      });
      expect(stepSchema.value.step1.fields.firstName.defaultValue).toBe('');
    });

    it('should reset the specified fields', () => {
      const title = titleCreator('reset:object-notation:fields');
      const stepSchema = new MultiStepFormStepSchema({
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

      stepSchema.value.step1.update({
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
            label: 'First Name Updated Label',
          };
        },
      });
      expect(stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: 'Updated',
        nameTransformCasing: 'camel',
        type: 'string',
        label: 'First Name Updated Label',
      });

      stepSchema.value.step1.reset({
        fields: {
          fields: {
            firstName: true,
          },
        },
      });
      expect(stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: '',
        nameTransformCasing: 'camel',
        type: 'string',
        label: 'firstName',
      });
    });
  });
});
