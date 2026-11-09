import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

/** Accepts readonly arrays, e.g. `as const` instance lists. */
const readonlyStrings = type('string[]').as<readonly string[]>();

const context = type({
  scope: "'instance'",
  reason: 'string',
  'instance?': 'unknown',
  'validInstances?': readonlyStrings,
});

export type InvalidInstanceContext = typeof context.infer;

/** Thrown when a form instance name is invalid or not declared. */
export class InvalidInstanceError extends createMultiStepFormError({
  code: 'invalidInstance',
  scope: 'instance',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
