import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'instance' as const;

export interface NoActiveInstanceContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  availableInstances?: readonly string[];
}

export class NoActiveInstanceError extends createMultiStepFormError(
  { code: 'noActiveInstance', scope },
)((scope, { reason }: NoActiveInstanceContext) => `[${scope}]: ${reason}`) {}
