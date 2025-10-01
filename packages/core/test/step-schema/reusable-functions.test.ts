import { describe, it, expect } from 'vitest';
import { MultiStepFormStepSchema } from '../../src';
import { type } from 'arktype';

describe('multi step form step schema: reusable functions', () => {
  describe('step specific', () => {
    it('should create a step specific reusable function with input', () => {
      const stepSchema = new MultiStepFormStepSchema({
        step1: {
          fields: [
            {
              name: 'firstName' as const,
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          ],
          title: 'Step 1',
        },
        step2: {
          fields: [
            {
              name: 'lastName' as const,
              defaultValue: '',
            },
          ],
          title: 'Step 2',
        },
        step3: {
          title: 'Step 3',
          fields: [
            {
              name: 'age' as const,
              defaultValue: 25,
            },
          ],
        },
      });
      const addToStep1Title = stepSchema.value.step1.createHelperFn(
        {
          validator: type('string'),
        },
        ({ ctx, data }) => `${ctx.step1.title} - ${data}`
      );

      expect(addToStep1Title({ data: 'Foo' })).toBe('Step 1 - Foo');
    });

    it('should create a step specific reusable function without input', () => {
      const stepSchema = new MultiStepFormStepSchema({
        step1: {
          fields: [
            {
              name: 'firstName' as const,
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          ],
          title: 'Step 1',
        },
        step2: {
          fields: [
            {
              name: 'lastName' as const,
              defaultValue: '',
            },
          ],
          title: 'Step 2',
        },
        step3: {
          title: 'Step 3',
          fields: [
            {
              name: 'age' as const,
              defaultValue: 25,
            },
          ],
        },
      });
      const addToStep1Title = stepSchema.value.step1.createHelperFn(
        ({ ctx }) => ctx.step1.title
      );

      expect(addToStep1Title()).toBe('Step 1');
    });
  });

  describe('general', () => {
    it('should create a reusable function without any input', () => {
      const stepSchema = new MultiStepFormStepSchema({
        step1: {
          fields: [
            {
              name: 'firstName' as const,
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          ],
          title: 'Step 1',
        },
        step2: {
          fields: [
            {
              name: 'lastName' as const,
              defaultValue: '',
            },
          ],
          title: 'Step 2',
        },
        step3: {
          title: 'Step 3',
          fields: [
            {
              name: 'age' as const,
              defaultValue: 25,
            },
          ],
        },
      });
      const getStep1Title = stepSchema.createHelperFn(
        { stepData: [1] },
        ({ ctx }) => {
          return ctx.step1.title;
        }
      );

      expect(getStep1Title()).toBe('Step 1');
    });

    it('should create a reusable function with input', () => {
      const stepSchema = new MultiStepFormStepSchema({
        step1: {
          fields: [
            {
              name: 'firstName' as const,
              defaultValue: '',
              nameTransformCasing: 'camel',
            },
          ],
          title: 'Step 1',
        },
        step2: {
          fields: [
            {
              name: 'lastName' as const,
              defaultValue: '',
            },
          ],
          title: 'Step 2',
        },
        step3: {
          title: 'Step 3',
          fields: [
            {
              name: 'age' as const,
              defaultValue: 25,
            },
          ],
        },
      });
      const addToTitle = stepSchema.createHelperFn(
        {
          stepData: [1],
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
