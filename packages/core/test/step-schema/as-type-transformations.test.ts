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
    const asString = as('string');

    expectTypeOf(asString.parse('1')).toEqualTypeOf<'1' | '2'>();
    expect(String(asString)).toBe("'1' | '2'");
    expect(asString.split(' | ')).toStrictEqual(["'1'", "'2'"]);
    expect(asString.parse('1')).toBe('1');
    expect(asString.allows('2')).toBe(true);
    expect(asString.allows(1)).toBe(false);
    expect(() => asString.parse(1)).toThrowError();
  });

  it('should transform the step numbers into a string union with keys', () => {
    const asStringKeys = as('string.keys');

    expectTypeOf(asStringKeys.parse('step1')).toEqualTypeOf<
      'step1' | 'step2'
    >();
    expect(String(asStringKeys)).toBe("'step1' | 'step2'");
    expect(asStringKeys.parse('step1')).toBe('step1');
    expect(asStringKeys.allows('step2')).toBe(true);
    expect(asStringKeys.allows('1')).toBe(false);
  });

  it('should transform the step numbers into a number union', () => {
    const asNumber = as('number');

    expectTypeOf(asNumber.parse(1)).toEqualTypeOf<1 | 2>();
    expect(String(asNumber)).toBe('1 | 2');
    expect(asNumber.parse(1)).toBe(1);
    expect(asNumber.allows(2)).toBe(true);
    expect(asNumber.allows('1')).toBe(false);
    expect(() => asNumber.parse('1')).toThrowError();
  });

  it('should transform the step numbers into a array of numbers', () => {
    const asArrayNumber = as('array.number');

    expectTypeOf(asArrayNumber.parse([1, 2])).toEqualTypeOf<
      // @ts-expect-error - Order can't be guaranteed
      [1, 2]
    >();
    expectTypeOf(asArrayNumber.parse.in(1)).toEqualTypeOf<1 | 2>();
    expect(asArrayNumber).toStrictEqual([1, 2]);
    expect(asArrayNumber.parse([2, 1])).toStrictEqual([2, 1]);
    expect(asArrayNumber.parse.in(1)).toBe(1);
    expect(asArrayNumber.allows([2, 1])).toBe(true);
    expect(asArrayNumber.allows([1])).toBe(false);
    expect(asArrayNumber.allows.in(2)).toBe(true);
    expect(asArrayNumber.allows.in('1')).toBe(false);
    expect(() => asArrayNumber.parse(1)).toThrowError();
  });

  it('should transform the step numbers into a array of strings', () => {
    const asArrayString = as('array.string');

    expectTypeOf(asArrayString.parse(['1', '2'])).toEqualTypeOf<['1', '2']>();
    expectTypeOf(asArrayString.parse.in('1')).toEqualTypeOf<'1' | '2'>();
    expect(asArrayString).toStrictEqual(['1', '2']);
    expect(asArrayString.parse(['2', '1'])).toStrictEqual(['2', '1']);
    expect(asArrayString.parse.in('1')).toBe('1');
    expect(asArrayString.allows(['2', '1'])).toBe(true);
    expect(asArrayString.allows(['1'])).toBe(false);
    expect(asArrayString.allows.in('2')).toBe(true);
    expect(asArrayString.allows.in(1)).toBe(false);
    expect(() => asArrayString.parse('1')).toThrowError();
  });

  it('should transform the step numbers into a array of strings with keys', () => {
    const asArrayStringKeys = as('array.string.keys');

    expectTypeOf(asArrayStringKeys.parse(['step1', 'step2'])).toEqualTypeOf<
      ['step1', 'step2']
    >();
    expectTypeOf(asArrayStringKeys.parse.in('step1')).toEqualTypeOf<
      'step1' | 'step2'
    >();
    expect(asArrayStringKeys).toStrictEqual(['step1', 'step2']);
    expect(asArrayStringKeys.parse(['step2', 'step1'])).toStrictEqual([
      'step2',
      'step1',
    ]);
    expect(asArrayStringKeys.parse.in('step1')).toBe('step1');
    expect(asArrayStringKeys.allows(['step2', 'step1'])).toBe(true);
    expect(asArrayStringKeys.allows(['step1'])).toBe(false);
    expect(asArrayStringKeys.allows.in('step2')).toBe(true);
    expect(asArrayStringKeys.allows.in('1')).toBe(false);
    expect(() => asArrayStringKeys.parse('step1')).toThrowError();
  });

  it('should transform the step numbers into a array of strings with untyped', () => {
    const asArrayUntyped = as('array.string.untyped');

    expectTypeOf(asArrayUntyped.parse(['1', '2'])).toEqualTypeOf<string[]>();
    expectTypeOf(asArrayUntyped.parse.in('1')).toEqualTypeOf<string>();
    expect(asArrayUntyped).toStrictEqual(['1', '2']);
    expect(asArrayUntyped.parse(['2', '1'])).toStrictEqual(['2', '1']);
    expect(asArrayUntyped.parse.in('1')).toBe('1');
    expect(asArrayUntyped.allows(['2', '1'])).toBe(true);
    expect(asArrayUntyped.allows(['1'])).toBe(false);
    expect(asArrayUntyped.allows.in('2')).toBe(true);
    expect(asArrayUntyped.allows.in(1)).toBe(false);
    expect(() => asArrayUntyped.parse('1')).toThrowError();
  });
});
