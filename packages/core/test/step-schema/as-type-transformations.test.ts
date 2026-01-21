import { describe, expect, it } from 'vitest';
import { createMultiStepFormSchema } from '../../src';

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
  const { as } = schema.stepSchema.steps;

  it('should transform the step numbers into a string union', () => {
    expect(as('string')).toBe("'1' | '2'");
  });

  it('should transform the step numbers into a string union with keys', () => {
    expect(as('string.keys')).toBe("'step1' | 'step2'");
  });

  it('should transform the step numbers into a number union', () => {
    expect(as('number')).toBe('1 | 2');
  });

  it('should transform the step numbers into a array of numbers', () => {
    expect(as('array.number')).toStrictEqual([1, 2]);
  });

  it('should transform the step numbers into a array of strings', () => {
    expect(as('array.string')).toStrictEqual(['1', '2']);
  });

  it('should transform the step numbers into a array of strings with keys', () => {
    expect(as('array.string.keys')).toStrictEqual(['step1', 'step2']);
  });

  it('should transform the step numbers into a array of strings with untyped', () => {
    expect(as('array.string.untyped')).toStrictEqual(['1', '2']);
  });
});
