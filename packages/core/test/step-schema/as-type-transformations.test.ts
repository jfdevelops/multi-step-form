import { describe, expect, expectTypeOf, it } from 'vitest';
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
    expectTypeOf(as('string')).toEqualTypeOf<"'1' | '2'">();
    expect(as('string')).toBe("'1' | '2'");
  });

  it('should transform the step numbers into a string union with keys', () => {
    expectTypeOf(as('string.keys')).toEqualTypeOf<"'step1' | 'step2'">();
    expect(as('string.keys')).toBe("'step1' | 'step2'");
  });

  it('should transform the step numbers into a number union', () => {
    expectTypeOf(as('number')).toEqualTypeOf<'1 | 2'>();
    expect(as('number')).toBe('1 | 2');
  });

  it('should transform the step numbers into a array of numbers', () => {
    expectTypeOf(as('array.number')).toEqualTypeOf<[1, 2]>();
    expect(as('array.number')).toStrictEqual([1, 2]);
  });

  it('should transform the step numbers into a array of strings', () => {
    expectTypeOf(as('array.string')).toEqualTypeOf<['1', '2']>();
    expect(as('array.string')).toStrictEqual(['1', '2']);
  });

  it('should transform the step numbers into a array of strings with keys', () => {
    expectTypeOf(as('array.string.keys')).toEqualTypeOf<['step1', 'step2']>();
    expect(as('array.string.keys')).toStrictEqual(['step1', 'step2']);
  });

  it('should transform the step numbers into a array of strings with untyped', () => {
    expectTypeOf(as('array.string.untyped')).toEqualTypeOf<string[]>();
    expect(as('array.string.untyped')).toStrictEqual(['1', '2']);
  });
});
