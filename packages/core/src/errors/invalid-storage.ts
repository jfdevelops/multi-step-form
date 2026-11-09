import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'storage'",
  reason: 'string',
  'key?': 'string',
  'operation?': 'string',
  'value?': 'unknown',
});

export type InvalidStorageContext = typeof context.infer;

/** Thrown when storage cannot be read or written. */
export class InvalidStorageError extends createMultiStepFormError({
  code: 'invalidStorage',
  scope: 'storage',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
