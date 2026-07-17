import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'context' as const;

export interface InvalidContextContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  stepData?: unknown;
  value?: unknown;
  expected?: unknown;
}

export class InvalidContextError extends createMultiStepFormError(
  { code: 'invalidContext', scope },
)((scope, { reason }: InvalidContextContext) => `[${scope}]: ${reason}`) {}
