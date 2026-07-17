import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'formConfig' as const;

export interface InvalidFormConfigContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  property?: string;
  value?: unknown;
  expected?: unknown;
}

export class InvalidFormConfigError extends createMultiStepFormError(
  { code: 'invalidFormConfig', scope },
)((scope, { reason }: InvalidFormConfigContext) => `[${scope}]: ${reason}`) {}
