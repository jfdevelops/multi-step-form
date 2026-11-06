import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'stepConfig'",
  reason: 'string',
  'key?': 'unknown',
  'value?': 'unknown',
  'expected?': 'unknown',
});

export type InvalidStepConfigContext = typeof context.infer;

/** Thrown when a step's configuration is invalid. */
export class InvalidStepConfigError extends createMultiStepFormError({
  code: 'invalidStepConfig',
  scope: 'stepConfig',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
