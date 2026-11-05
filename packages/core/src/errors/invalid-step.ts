import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'step' as const;

export interface InvalidStepContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  targetStep?: unknown;
  validSteps?: unknown[];
}

export class InvalidStepError extends createMultiStepFormError(
  { code: 'invalidStep', scope },
)((scope, { reason }: InvalidStepContext) => `[${scope}]: ${reason}`) {}
