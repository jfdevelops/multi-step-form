import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  createMultiStepFormError,
  InvalidKeyError,
  MultiStepFormError,
  UpdateMismatchError,
  type UpdateMismatchContext,
} from '../src';

describe('custom errors', () => {
  it('creates an error from context data', () => {
    class ValidationError extends createMultiStepFormError({
      code: 'validation',
      scope: 'field',
    })(
      (_scope, context: { scope: 'field'; field: string }) =>
        `${context.field} is invalid`,
    ) {}

    const error = new ValidationError({
      field: 'email',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(MultiStepFormError);
    expect(error.message).toBe('email is invalid');
    expect(error.context).toStrictEqual({ scope: 'field', field: 'email' });
    expectTypeOf(error.code).toEqualTypeOf<'validation'>();
    expect(error.scope).toBe('field');
    expectTypeOf(error.scope).toEqualTypeOf<'field'>();
    expectTypeOf(error.context.scope).toEqualTypeOf<'field'>();
  });

  it('supports custom message rendering', () => {
    const ValidationErrorBase = createMultiStepFormError({
      code: 'validation',
      scope: 'field',
    })(
      (_scope, context: { scope: 'field'; field: string }) =>
        `${context.field} is invalid`,
    );
    const error = new ValidationErrorBase({
      field: 'email',
    });

    expect(error.renderMessage()).toBe('email is invalid');
    expect(
      error.renderMessage(
        (scope, { field }) => `[${scope}] Check the ${field} field`,
      ),
    ).toBe('[field] Check the email field');
    expect(error.message).toBe('email is invalid');
  });

  it('is the base class for invalid key errors', () => {
    const error = new InvalidKeyError({
      invalidKeys: ['unknown'],
      validKeys: ['known'],
    });

    expect(error).toBeInstanceOf(MultiStepFormError);
    expect(error.code).toBe('invalidKey');
    expect(error.context.scope).toBe('invalidKey');
    expect(error.message).toContain('Invalid keys were found (unknown)');
  });

  it('exposes update mismatch details as structured data', () => {
    const mismatches = [
      {
        path: 'fields.email',
        reason: 'missing-key' as const,
        expected: 'object',
        actual: undefined,
      },
    ];
    const error = new UpdateMismatchError({
      targetStep: 'step2',
      fields: 'all',
      strict: true,
      partial: false,
      mismatches,
      mismatchDetails: 'Missing key at "fields.email"',
    });

    expect(error).toBeInstanceOf(MultiStepFormError);
    expect(error.context.scope).toBe('update');
    expect(error.scope).toBe('update');
    expectTypeOf(error.scope).toEqualTypeOf<'update'>();
    expectTypeOf(error.context.scope).toEqualTypeOf<'update'>();
    expectTypeOf(error.context).toEqualTypeOf<UpdateMismatchContext>();
    expect(error.message).toContain('targetStep="step2"');
    expect(error.toJSON()).toHaveProperty(
      'context.mismatches.0.actual',
      null,
    );
    expect(JSON.parse(JSON.stringify(error))).toStrictEqual(error.toJSON());
  });
});
