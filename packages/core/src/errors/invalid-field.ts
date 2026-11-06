import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'field'",
  reason: 'string',
  'targetStep?': 'unknown',
  'field?': 'unknown',
  'validFields?': 'unknown[]',
});

export type InvalidFieldContext = typeof context.infer;

/** Thrown when a field does not exist on its step. */
export class InvalidFieldError extends createMultiStepFormError({
  code: 'invalidField',
  scope: 'field',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
