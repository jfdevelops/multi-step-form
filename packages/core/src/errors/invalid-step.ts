import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'step'",
  reason: 'string',
  'targetStep?': 'unknown',
  'validSteps?': 'unknown[]',
});

export type InvalidStepContext = typeof context.infer;

/** Thrown when a step does not exist. */
export class InvalidStepError extends createMultiStepFormError({
  code: 'invalidStep',
  scope: 'step',
})
  .defineContext(context)
  .implement(({ context, scope }) => `[${scope}]: ${context.reason}`) {}
