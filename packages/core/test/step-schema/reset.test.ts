import { describe, expect, it } from 'vitest';
import { defineMultiStepForm } from '../../src';
import { titleCreator } from '../utils/title-creator';

describe('multi step form step schema: reset', () => {
  // Note: this test needs to be first otherwise `schema` will be from a different test
  it('should reset all the fields', () => {
    const title = titleCreator('reset:all');
    const schema = defineMultiStepForm({
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
    }).configure()();

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
            isRequired: false,
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
            isRequired: false,
          },
        },
        title: title('Step 1'),
        nameTransformCasing: 'title',
      })
    );
  });

  it('preserves other steps when resetting all fields for one step', () => {
    const schema = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
        step2: {
          title: 'Step 2',
          fields: {
            lastName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure()();

    schema.stepSchema.value.step1.update({
      fields: ['fields.firstName.defaultValue'],
      updater: 'Taylor',
    });
    schema.stepSchema.value.step2.update({
      fields: ['fields.lastName.defaultValue'],
      updater: 'Smith',
    });

    schema.stepSchema.value.step1.reset();

    expect(schema.stepSchema.value.step1.fields.firstName.defaultValue).toBe(
      ''
    );
    expect(schema.stepSchema.value.step2.fields.lastName.defaultValue).toBe(
      'Smith'
    );
  });

  describe('tuple notation', () => {
    it('should reset the specified field', () => {
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

      schema.stepSchema.value.step1.update({
        fields: ['fields.firstName.defaultValue'],
        updater: 'Updated',
      });
      schema.stepSchema.value.step2.update({
        fields: ['fields.lastName.defaultValue'],
        updater: 'Preserved',
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
      expect(schema.stepSchema.value.step2.fields.lastName.defaultValue).toBe(
        'Preserved'
      );
    });

    it('should reset the specified fields', () => {
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
        isRequired: false,
      });

      schema.stepSchema.value.step1.reset({
        fields: ['fields.firstName'],
      });
      expect(schema.stepSchema.value.step1.fields.firstName).toStrictEqual({
        defaultValue: '',
        nameTransformCasing: 'camel',
        name: 'firstName',
        label: 'firstName',
        isRequired: false,
      });
    });
  });

  describe('object notation', () => {
    it('should reset the specified field', () => {
      const title = titleCreator('reset:object-notation:field');
      const schema = defineMultiStepForm({
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
      }).configure()();

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
      const schema = defineMultiStepForm({
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
      }).configure()();

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
        isRequired: false,
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
        isRequired: false,
      });
    });
  });
});
