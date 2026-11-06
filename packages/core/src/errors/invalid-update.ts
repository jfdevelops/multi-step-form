import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'update'",
  reason: 'string',
  'targetStep?': 'unknown',
  'fields?': 'unknown',
  'value?': 'unknown',
  'expected?': 'unknown',
});

export type InvalidUpdateContext = typeof context.infer;

/** Thrown when an update targets invalid steps or fields. */
export class InvalidUpdateError extends createMultiStepFormError({
  code: 'invalidUpdate',
  scope: 'update',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
