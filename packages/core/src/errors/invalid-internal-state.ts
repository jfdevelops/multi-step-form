import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'internal' as const;

export interface InvalidInternalStateContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  operation?: string;
  value?: unknown;
}

export class InvalidInternalStateError extends createMultiStepFormError(
  { code: 'invalidInternalState', scope },
)(
  (scope, { reason }: InvalidInternalStateContext) => `[${scope}]: ${reason}`,
) {}
