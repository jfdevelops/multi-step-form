import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'component'",
  reason: 'string',
  'component?': 'string',
  'argument?': 'string',
  'value?': 'unknown',
});

export type InvalidComponentContext = typeof context.infer;

/** Thrown when a component helper receives an invalid argument. */
export class InvalidComponentError extends createMultiStepFormError({
  code: 'invalidComponent',
  scope: 'component',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
