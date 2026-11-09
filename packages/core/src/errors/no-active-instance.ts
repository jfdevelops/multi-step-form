import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

/** Accepts readonly arrays, e.g. `as const` instance lists. */
const readonlyStrings = type('string[]').as<readonly string[]>();

const context = type({
  scope: "'instance'",
  reason: 'string',
  'availableInstances?': readonlyStrings,
});

export type NoActiveInstanceContext = typeof context.infer;

/** Thrown when a form with instances is used without an active instance. */
export class NoActiveInstanceError extends createMultiStepFormError({
  code: 'noActiveInstance',
  scope: 'instance',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
