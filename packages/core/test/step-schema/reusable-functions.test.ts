import { describe, it, expect } from 'vitest';
import { createMultiStepFormSchema } from '../../src';
import { type } from 'arktype';

describe('multi step form step schema: reusable functions', () => {
  describe('step specific', () => {
    it('should create a step specific reusable function with input', () => {
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
      const addToStep1Title = schema.stepSchema.value.step1.createHelperFn(
        {
          validator: type('string'),
        },
        ({ ctx, data }) => `${ctx.step1.title} - ${data}`
      );

      expect(addToStep1Title({ data: 'Foo' })).toBe('Step 1 - Foo');
    });

    it('should create a step specific reusable function without input', () => {
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
      const addToStep1Title = schema.stepSchema.value.step1.createHelperFn(
        ({ ctx }) => ctx.step1.title
      );

      expect(addToStep1Title()).toBe('Step 1');
    });
  });

  describe('general', () => {
    describe('stepData array version', () => {
      it('should create a reusable function without any input', () => {
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
        const getStep1Title = schema.stepSchema.createHelperFn(
          { stepData: ['step1'] },
          ({ ctx }) => {
            return ctx.step1.title;
          }
        );

        expect(getStep1Title()).toBe('Step 1');
      });

      it('should create a reusable function with input', () => {
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
        const addToTitle = schema.stepSchema.createHelperFn(
          {
            stepData: ['step1'],
            validator: type({ word: 'string > 1' }),
          },
          ({ ctx, data }) => `${ctx.step1.title} - ${data.word}`
        );

        expect(
          addToTitle({
            data: {
              word: 'foo',
            },
          })
        ).toBe('Step 1 - foo');
      });
    });

    describe('stepData object version', () => {
      it('should create a reusable function without any input', () => {
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
        const getStep1Title = schema.stepSchema.createHelperFn(
          {
            stepData: {
              step1: true,
            },
          },
          ({ ctx }) => {
            return ctx.step1.title;
          }
        );

        expect(getStep1Title()).toBe('Step 1');
      });

      it('should create a reusable function with input', () => {
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
        const addToTitle = schema.stepSchema.createHelperFn(
          {
            stepData: {
              step1: true,
            },
            validator: type({ word: 'string > 1' }),
          },
          ({ ctx, data }) => `${ctx.step1.title} - ${data.word}`
        );

        expect(
          addToTitle({
            data: {
              word: 'foo',
            },
          })
        ).toBe('Step 1 - foo');
      });
    });
  });
});
