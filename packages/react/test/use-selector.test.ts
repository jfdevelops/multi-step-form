import { describe, expect, it } from 'vitest';
import { deepEqual } from '../src/hooks/use-selector';

describe('deepEqual', () => {
  it('considers dates with the same timestamp equal', () => {
    expect(
      deepEqual(
        new Date('2026-07-15T12:00:00.000Z'),
        new Date('2026-07-15T12:00:00.000Z'),
      )
    ).toBe(true);
  });

  it('considers dates with different timestamps unequal', () => {
    expect(
      deepEqual(
        new Date('2026-07-15T12:00:00.000Z'),
        new Date('2026-07-15T13:00:00.000Z'),
      )
    ).toBe(false);
  });

  it('considers two invalid dates equal', () => {
    expect(deepEqual(new Date('invalid'), new Date('invalid'))).toBe(true);
  });

  it('does not consider a date equal to a plain object', () => {
    expect(deepEqual(new Date('2026-07-15T12:00:00.000Z'), {})).toBe(false);
  });
});
