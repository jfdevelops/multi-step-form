import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'helper'",
  reason: 'string',
  'helper?': 'string',
  'value?': 'unknown',
  'expected?': 'unknown',
});

export type InvalidHelperInputContext = typeof context.infer;

/** Thrown when a helper function receives invalid input. */
export class InvalidHelperInputError extends createMultiStepFormError({
  code: 'invalidHelperInput',
  scope: 'helper',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
