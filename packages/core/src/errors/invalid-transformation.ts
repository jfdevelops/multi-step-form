import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'transformation' as const;

export interface InvalidTransformationContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  value?: unknown;
  transformation?: unknown;
  validValues?: unknown[];
}

export class InvalidTransformationError extends createMultiStepFormError(
  { code: 'invalidTransformation', scope },
)(
  (scope, { reason }: InvalidTransformationContext) => `[${scope}]: ${reason}`,
) {}
