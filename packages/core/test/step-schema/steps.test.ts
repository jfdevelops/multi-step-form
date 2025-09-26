import { describe, it, expect } from 'vitest';
import { MultiStepFormStepSchema } from '../../src';

describe('multi step form step schema: steps', () => {
  it('returns the first step number', () => {
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

    expect(stepSchema.steps.first).toBe(1);
  });

  it('returns the last step number', () => {
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

    expect(stepSchema.steps.last).toBe(3);
  });

  it('returns the values of the step numbers', () => {
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

    expect(stepSchema.steps.value).toStrictEqual([1, 2, 3]);
  });

  describe('transformations', () => {
    it('transforms steps into a string union', () => {
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

      expect(stepSchema.steps.as('string')).toBe("'1' | '2' | '3'");
    });

    it('transforms steps into a string array', () => {
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

      expect(stepSchema.steps.as('array.string')).toStrictEqual([
        '1',
        '2',
        '3',
      ]);
    });

    it('transforms steps into a number union', () => {
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

      expect(stepSchema.steps.as('number')).toStrictEqual('1 | 2 | 3');
    });

    it("throws an error if transformation type isn't a valid string", () => {
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

      expect(() =>
        stepSchema.steps.as(
          //@ts-ignore
          'foo'
        )
      ).toThrowError(Error);
    });

    it("throws an error if transformation type isn't a valid type", () => {
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

      expect(() =>
        stepSchema.steps.as(
          //@ts-ignore
          0
        )
      ).toThrowError(Error);
    });
  });
});
