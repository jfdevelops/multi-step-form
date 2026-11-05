import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'helper' as const;

export interface InvalidHelperInputContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  helper?: string;
  value?: unknown;
  expected?: unknown;
}

export class InvalidHelperInputError extends createMultiStepFormError(
  { code: 'invalidHelperInput', scope },
)(
  (scope, { reason }: InvalidHelperInputContext) => `[${scope}]: ${reason}`,
) {}
