import { describe, it, expect } from 'vitest';
import { getInferredFieldType } from '@/utils/field-types';

describe('getInferredFieldType', () => {
  it('should infer the type', () => {
    expect(getInferredFieldType({ defaultValue: 'string' })).toBe('string');
    expect(getInferredFieldType({ defaultValue: 0 })).toBe('number');
    expect(getInferredFieldType({ defaultValue: true })).toBe('boolean');
    expect(getInferredFieldType({ defaultValue: new Date() })).toBe('date');
    expect(getInferredFieldType({ defaultValue: { foo: 'string' } })).toBe(
      'object'
    );
    expect(getInferredFieldType({ defaultValue: [1, 'string', true] })).toBe(
      '[number, string, boolean]'
    );
    expect(
      getInferredFieldType({
        defaultValue: [[1, 'string', true] as const],
      })
    ).toBe('[number, string, boolean][]');
    expect(
      getInferredFieldType({ defaultValue: [[[1, 'string', true]] as const] })
    ).toBe('(string | number | boolean)[][][]');
    expect(
      getInferredFieldType({ defaultValue: [[[[1, 'string', true]]] as const] })
    ).toBe('(string | number | boolean)[][][][]');
    expect(
      getInferredFieldType({
        defaultValue: [[[[[1, 'string', true]]]]] as const,
      })
    ).toBe('(string | number | boolean)[][][][][]');
  });

  it('should use the type if provided', () => {
    expect(getInferredFieldType({ defaultValue: 0, type: 'string' })).toBe(
      'string'
    );
    expect(getInferredFieldType({ defaultValue: '', type: 'number' })).toBe(
      'number'
    );
    expect(
      getInferredFieldType({ defaultValue: '', type: 'boolean.switch' })
    ).toBe('boolean.switch');
    expect(getInferredFieldType({ defaultValue: '', type: 'date' })).toBe(
      'date'
    );
    expect(
      getInferredFieldType({ defaultValue: '', type: 'number.counter' })
    ).toBe('number.counter');
    expect(
      getInferredFieldType({
        defaultValue: [1, 'string', true],
        type: 'string.phone',
      })
    ).toBe('string.phone');
  });
});
