import { describe, expect, it, vi } from 'vitest';
import { createConditions, type ConditionExpression } from '../src';

interface Context {
  authenticated: boolean;
  owner: boolean;
  role: 'admin' | 'member';
}

describe('conditions', () => {
  const conditions = createConditions<Context>();

  it('evaluates bare arrays with and semantics', () => {
    const expression = [
      ({ authenticated }: Context) => authenticated,
      ({ owner }: Context) => owner,
    ] satisfies ConditionExpression<Context>;

    expect(
      conditions.evaluate(expression, {
        authenticated: true,
        owner: true,
        role: 'member',
      }),
    ).toBe(true);
    expect(
      conditions.evaluate(expression, {
        authenticated: true,
        owner: false,
        role: 'member',
      }),
    ).toBe(false);
  });

  it('evaluates recursive and and or expressions', () => {
    const expression = {
      or: [
        ({ role }: Context) => role === 'admin',
        {
          and: [
            ({ authenticated }: Context) => authenticated,
            ({ owner }: Context) => owner,
          ],
        },
      ],
    } satisfies ConditionExpression<Context>;

    expect(
      conditions.evaluate(expression, {
        authenticated: false,
        owner: false,
        role: 'admin',
      }),
    ).toBe(true);
    expect(
      conditions.evaluate(expression, {
        authenticated: true,
        owner: true,
        role: 'member',
      }),
    ).toBe(true);
    expect(
      conditions.evaluate(expression, {
        authenticated: true,
        owner: false,
        role: 'member',
      }),
    ).toBe(false);
  });

  it('short circuits logical groups', () => {
    const skipped = vi.fn(() => true);

    expect(
      conditions.evaluate(
        { or: [true, skipped] },
        { authenticated: false, owner: false, role: 'member' },
      ),
    ).toBe(true);
    expect(skipped).not.toHaveBeenCalled();
  });

  it('creates named reusable conditions and compiled expressions', () => {
    const isAuthenticated = conditions.createCondition({
      name: 'is authenticated',
      condition: ({ authenticated }) => authenticated,
    });
    const canContinue = conditions.compile({
      and: [isAuthenticated, ({ owner }) => owner],
    });
    const context = {
      authenticated: true,
      owner: true,
      role: 'member' as const,
    };

    expect(isAuthenticated.conditionName).toBe('is authenticated');
    expect(canContinue(context)).toBe(true);
  });

  it('constructs, combines, and normalizes expressions', () => {
    const isAuthenticated = conditions.createCondition(
      ({ authenticated }) => authenticated,
    );
    const ownsResource = conditions.createCondition(({ owner }) => owner);
    const isAdmin = conditions.createCondition(({ role }) => role === 'admin');
    const expression = conditions.combine(
      conditions.and(isAuthenticated, ownsResource),
      conditions.or(isAdmin, ownsResource),
    );

    expect(expression).toEqual({
      and: [
        { and: [isAuthenticated, ownsResource] },
        { or: [isAdmin, ownsResource] },
      ],
    });
    expect(conditions.normalize([isAuthenticated])).toEqual({
      and: [isAuthenticated],
    });
  });
});
