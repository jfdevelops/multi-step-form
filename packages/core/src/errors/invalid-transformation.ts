import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'transformation'",
  reason: 'string',
  'value?': 'unknown',
  'transformation?': 'unknown',
  'validValues?': 'unknown[]',
});

export type InvalidTransformationContext = typeof context.infer;

/** Thrown when a name transformation is invalid. */
export class InvalidTransformationError extends createMultiStepFormError({
  code: 'invalidTransformation',
  scope: 'transformation',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
