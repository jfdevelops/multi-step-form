import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'field' as const;

export interface InvalidFieldContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  targetStep?: unknown;
  field?: unknown;
  validFields?: unknown[];
}

export class InvalidFieldError extends createMultiStepFormError(
  { code: 'invalidField', scope },
)((scope, { reason }: InvalidFieldContext) => `[${scope}]: ${reason}`) {}
