import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from '@jfdevelops/multi-step-form-core';

const scope = 'builder' as const;

export interface FormBuilderErrorContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  /** The builder command or helper that failed, e.g. `fields.add`. */
  operation: string;
  /** The id, key or type the operation was given. */
  target?: unknown;
}

/**
 * Thrown when a builder command, registry lookup or compilation receives input it cannot act on
 * (an unknown id, an unregistered field type, a missing validator adapter, …).
 */
export class FormBuilderError extends createMultiStepFormError({
  code: 'formBuilder',
  scope,
})(
  (scope, { operation, reason }: FormBuilderErrorContext) =>
    `[${scope}:${operation}]: ${reason}`,
) {}
