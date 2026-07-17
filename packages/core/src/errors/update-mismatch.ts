import type { path } from '@/utils/path';
import {
  createMultiStepFormError,
  type MultiStepFormErrorContext,
} from './multi-step-form-error.js';

const scope = 'update' as const;

export interface UpdateMismatchContext extends MultiStepFormErrorContext<typeof scope> {
  targetStep: string;
  fields: unknown;
  strict: boolean;
  partial: boolean;
  mismatches: path.Mismatch[];
  mismatchDetails: string;
}

export class UpdateMismatchError extends createMultiStepFormError(
  { code: 'updateMismatch', scope },
)(
  (
    scope,
    {
      targetStep,
      fields,
      strict,
      partial,
      mismatchDetails,
    }: UpdateMismatchContext,
  ) =>
    `[${scope}]: value mismatches for targetStep="${targetStep}", fields=${JSON.stringify(
      fields,
    )}, strict=${strict}, partial=${partial}\n${mismatchDetails}`,
) {}
