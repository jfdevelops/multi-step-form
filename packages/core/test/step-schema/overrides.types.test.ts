import { describe, expectTypeOf, it } from 'vitest';
import { defineMultiStepForm } from '../../src';

describe('multi step form step schema: overrides types', () => {
  it('infers override data as the resolved current step', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            age: {
              defaultValue: 0,
            },
          },
        },
      },
    }).configure();

    createForm().withOverrides({
      step1: ({ fields, title }) => {
        expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
        expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();
        expectTypeOf(title).toEqualTypeOf<string>();

        return { age: 890 + fields.age.defaultValue };
      },
    });
  });

  it('infers override data for destructured arrow functions', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            age: {
              defaultValue: 0,
            },
          },
        },
      },
    }).configure();

    createForm().withOverrides({
      step1: ({ fields }) => {
        expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
        expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();

        return {
          age: 42,
        };
      },
    });
  });

  it('rejects override keys that are not defined on the current step', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
        },
      },
    }).configure();

    createForm().withOverrides({
      // @ts-expect-error invalid override key
      step1: () => {
        return {
          lastName: 'Finkel',
        };
      },
    });
  });

  it('supports async overrides', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            age: {
              defaultValue: 0,
            },
          },
        },
      },
    }).configure();

    createForm().withOverrides({
      step1: async ({ fields, title }) => {
        expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
        expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();
        expectTypeOf(title).toEqualTypeOf<string>();

        await new Promise((resolve) => setTimeout(resolve, 100));

        return { age: 42 };
      },
    });
  });

  it('keeps the return type constrained to the current step defaults', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            age: {
              defaultValue: 0,
            },
          },
        },
      },
    }).configure();

    createForm().withOverrides({
      step1: ({ fields }) => {
        expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
        expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();

        return {
          firstName: 'Taylor',
        };
      },
    });
  });

  it('does not expose a string index on resolved override fields', () => {
    const createForm = defineMultiStepForm({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
            saveToAccount: {
              defaultValue: false,
            },
          },
        },
      },
    }).configure();

    createForm().withOverrides({
      step1: (data) => {
        expectTypeOf(data.fields.firstName.defaultValue).toEqualTypeOf<string>();
        expectTypeOf(data.fields.saveToAccount.defaultValue).toEqualTypeOf<boolean>();

        // @ts-expect-error unknown field should not be available
        data.fields.notARealField;

        return {
          firstName: 'Taylor',
        };
      },
    });
  });
});
