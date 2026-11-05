import { describe, expect, it, vi } from 'vitest';
import { sharedFieldFunction } from '../src/field-function';

describe('sharedFieldFunction', () => {
  it('assigns caller-provided implementations to the original callable', () => {
    type ScopedFunction = ((value: number) => number) & {
      forFields(fields: string[]): string[];
      readonly scope: string;
      withConditions(condition: boolean): boolean;
    };

    const fieldFunction = vi.fn((value: number) => value * 2);
    const registeredFunction = sharedFieldFunction.registerFunction({
      type: 'base',
      value: fieldFunction,
    });
    const forFields = registeredFunction.registerFunction({
      type: 'assigned',
      value: vi.fn((fields: string[]) => fields),
    });
    const withConditions = registeredFunction.registerFunction({
      type: 'assigned',
      value: vi.fn((condition: boolean) => condition),
    });

    const scopedFunction: ScopedFunction = sharedFieldFunction({
      base: registeredFunction,
      assignedFunctions: {
        forFields,
        withConditions,
      },
      assignedProperties: { scope: 'step1' },
    });

    expect(scopedFunction).toBe(fieldFunction);
    expect(scopedFunction(3)).toBe(6);
    expect(scopedFunction.forFields(['name'])).toEqual(['name']);
    expect(scopedFunction.withConditions(true)).toBe(true);
    expect(scopedFunction.scope).toBe('step1');
    expect(forFields).toHaveBeenCalledWith(['name']);
    expect(withConditions).toHaveBeenCalledWith(true);
  });
});
