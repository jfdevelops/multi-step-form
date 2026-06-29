import { describe, expectTypeOf, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

describe('multi step form step schema: overrides types', () => {
  it('infers override data as the resolved current step', () => {
    createMultiStepFormSchema({
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
          overrides: ({ fields, title }) => {
            expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
            expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();
            expectTypeOf(title).toEqualTypeOf<string>();

            return { age: 890 + fields.age.defaultValue };
          },
        },
      },
    });
  });

  it('infers override data for destructured arrow functions', () => {
    createMultiStepFormSchema({
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
          overrides: ({ fields }) => {
            expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
            expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();

            return {
              age: 42,
            };
          },
        },
      },
    });
  });

  it('rejects override keys that are not defined on the current step', () => {
    createMultiStepFormSchema({
      steps: {
        step1: {
          title: 'Step 1',
          fields: {
            firstName: {
              defaultValue: '',
            },
          },
          // @ts-expect-error invalid override key
          overrides: () => {
            return {
              lastName: 'Finkel',
            };
          },
        },
      },
    });
  });

  it('supports async overrides', () => {
    createMultiStepFormSchema({
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
          overrides: async ({ fields, title }) => {
            expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
            expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();
            expectTypeOf(title).toEqualTypeOf<string>();

            await new Promise((resolve) => setTimeout(resolve, 100));

            return { age: 42 };
          },
        },
      },
    });
  });

  it('keeps the return type constrained to the current step defaults', () => {
    createMultiStepFormSchema({
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
          overrides: ({ fields }) => {
            expectTypeOf(fields.firstName.defaultValue).toEqualTypeOf<string>();
            expectTypeOf(fields.age.defaultValue).toEqualTypeOf<number>();

            return {
              firstName: 'Taylor',
            };
          },
        },
      },
    });
  });
});
