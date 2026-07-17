import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'stepConfig' as const;

export interface InvalidStepConfigContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  key?: unknown;
  value?: unknown;
  expected?: unknown;
}

export class InvalidStepConfigError extends createMultiStepFormError(
  { code: 'invalidStepConfig', scope },
)((scope, { reason }: InvalidStepConfigContext) => `[${scope}]: ${reason}`) {}
