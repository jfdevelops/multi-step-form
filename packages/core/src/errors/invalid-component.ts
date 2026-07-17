import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'component' as const;

export interface InvalidComponentContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  component?: string;
  argument?: string;
  value?: unknown;
}

export class InvalidComponentError extends createMultiStepFormError(
  { code: 'invalidComponent', scope },
)((scope, { reason }: InvalidComponentContext) => `[${scope}]: ${reason}`) {}
