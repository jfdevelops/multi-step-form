import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'formConfig'",
  reason: 'string',
  'property?': 'string',
  'value?': 'unknown',
  'expected?': 'unknown',
});

export type InvalidFormConfigContext = typeof context.infer;

/** Thrown when the form's configuration is invalid. */
export class InvalidFormConfigError extends createMultiStepFormError({
  code: 'invalidFormConfig',
  scope: 'formConfig',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
