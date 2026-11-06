import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'context'",
  reason: 'string',
  'stepData?': 'unknown',
  'value?': 'unknown',
  'expected?': 'unknown',
});

export type InvalidContextContext = typeof context.infer;

/** Thrown when step data is missing or has an unexpected shape. */
export class InvalidContextError extends createMultiStepFormError({
  code: 'invalidContext',
  scope: 'context',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
