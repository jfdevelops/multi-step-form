import { createMultiStepFormSchema } from '../../src';
import { describe, it, expect } from 'vitest';

describe('multi step form step schema: as type transformations', () => {
  const schema = createMultiStepFormSchema({
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
  });

  it('should transform the step numbers into a string union', () => {
    expect(schema.stepSchema.steps.as('string')).toBe("'1' | '2'");
  });

  it('should transform the step numbers into a string union with keys', () => {
    expect(schema.stepSchema.steps.as('string.keys')).toBe("'step1' | 'step2'");
  });

  it('should transform the step numbers into a number union', () => {
    expect(schema.stepSchema.steps.as('number')).toBe('1 | 2');
  });

  it('should transform the step numbers into a array of numbers', () => {
    expect(schema.stepSchema.steps.as('array.number')).toStrictEqual([1, 2]);
  });

  it('should transform the step numbers into a array of strings', () => {
    expect(schema.stepSchema.steps.as('array.string')).toStrictEqual([
      '1',
      '2',
    ]);
  });

  it('should transform the step numbers into a array of strings with keys', () => {
    expect(schema.stepSchema.steps.as('array.string.keys')).toStrictEqual([
      'step1',
      'step2',
    ]);
  });

  it('should transform the step numbers into a array of strings with untyped', () => {
    expect(schema.stepSchema.steps.as('array.string.untyped')).toStrictEqual([
      '1',
      '2',
    ]);
  });
});
