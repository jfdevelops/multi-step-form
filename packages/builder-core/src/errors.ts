import { createMultiStepFormError } from '@jfdevelops/multi-step-form-core';
import { type } from 'arktype';

const context = type({
  scope: "'builder'",
  reason: 'string',
  /** The builder command or helper that failed, e.g. `fields.add`. */
  operation: 'string',
  /** The id, key or type the operation was given. */
  'target?': 'unknown',
});

export type FormBuilderErrorContext = typeof context.infer;

/**
 * Thrown when a builder command, registry lookup or compilation receives input it cannot act on
 * (an unknown id, an unregistered field type, a missing validator adapter, …).
 */
export class FormBuilderError extends createMultiStepFormError({
  code: 'formBuilder',
  scope: 'builder',
})
  .defineContext(context)
  .implement(
    ({ context, scope }) => `[${scope}:${context.operation}]: ${context.reason}`,
  ) {}
