import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'update' as const;

export interface InvalidUpdateContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  targetStep?: unknown;
  fields?: unknown;
  value?: unknown;
  expected?: unknown;
}

export class InvalidUpdateError extends createMultiStepFormError(
  { code: 'invalidUpdate', scope },
)((scope, { reason }: InvalidUpdateContext) => `[${scope}]: ${reason}`) {}
