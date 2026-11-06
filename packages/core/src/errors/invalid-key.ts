import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'invalidKey'",
  invalidKeys: 'unknown[]',
  validKeys: 'unknown[]',
});

export type InvalidKeyContext = typeof context.infer;

/** Thrown when an object has keys its step or field does not declare. */
export class InvalidKeyError extends createMultiStepFormError({
  code: 'invalidKey',
  scope: 'invalidKey',
})
  .defineContext(context)
  .implement(({ context, scope }) => {
    const formatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'conjunction',
    });
    const invalidMessage = `Invalid keys were found (${formatter.format(
      context.invalidKeys.map(String),
    )}). Please remove them to continue.`;
    const validMessage = `The available keys are ${formatter.format(
      context.validKeys.map(String),
    )}`;

    return `[${scope}]: ${invalidMessage} ${validMessage}`;
  }) {}
