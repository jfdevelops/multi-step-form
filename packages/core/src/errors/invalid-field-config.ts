import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'fieldConfig' as const;

export interface InvalidFieldConfigContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  field?: unknown;
  value?: unknown;
  expected?: unknown;
}

export class InvalidFieldConfigError extends createMultiStepFormError(
  { code: 'invalidFieldConfig', scope },
)((scope, { reason }: InvalidFieldConfigContext) => `[${scope}]: ${reason}`) {}
