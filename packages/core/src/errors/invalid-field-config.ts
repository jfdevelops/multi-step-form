import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'fieldConfig'",
  reason: 'string',
  'field?': 'unknown',
  'value?': 'unknown',
  'expected?': 'unknown',
});

export type InvalidFieldConfigContext = typeof context.infer;

/** Thrown when a field's configuration is invalid. */
export class InvalidFieldConfigError extends createMultiStepFormError({
  code: 'invalidFieldConfig',
  scope: 'fieldConfig',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
