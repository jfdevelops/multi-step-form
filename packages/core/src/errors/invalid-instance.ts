import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'instance' as const;

export interface InvalidInstanceContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  instance?: unknown;
  validInstances?: readonly string[];
}

export class InvalidInstanceError extends createMultiStepFormError(
  { code: 'invalidInstance', scope },
)((scope, { reason }: InvalidInstanceContext) => `[${scope}]: ${reason}`) {}
