import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'invalidKey' as const;

export interface InvalidKeyContext
  extends MultiStepFormErrorContext<typeof scope> {
  invalidKeys: unknown[];
  validKeys: unknown[];
}

export class InvalidKeyError extends createMultiStepFormError(
  { code: 'invalidKey', scope },
)(
  (scope, { invalidKeys, validKeys }: InvalidKeyContext) => {
    const formatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'conjunction',
    });
    const invalidMessage = `Invalid keys were found (${formatter.format(
      invalidKeys.map(String),
    )}). Please remove them to continue.`;
    const validMessage = `The available keys are ${formatter.format(
      validKeys.map(String),
    )}`;

    return `[${scope}]: ${invalidMessage} ${validMessage}`;
  },
) {}
