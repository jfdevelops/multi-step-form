import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'storage' as const;

export interface InvalidStorageContext
  extends MultiStepFormErrorContext<typeof scope> {
  reason: string;
  key?: string;
  operation?: string;
  value?: unknown;
}

export class InvalidStorageError extends createMultiStepFormError(
  { code: 'invalidStorage', scope },
)((scope, { reason }: InvalidStorageContext) => `[${scope}]: ${reason}`) {}
