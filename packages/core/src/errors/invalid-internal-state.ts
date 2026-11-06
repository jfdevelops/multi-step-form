import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'internal'",
  reason: 'string',
  'operation?': 'string',
  'value?': 'unknown',
});

export type InvalidInternalStateContext = typeof context.infer;

/** Thrown when the form's internal state is inconsistent. */
export class InvalidInternalStateError extends createMultiStepFormError({
  code: 'invalidInternalState',
  scope: 'internal',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
