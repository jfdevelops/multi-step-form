import type { path } from '@/utils/path';
import { type } from 'arktype';
import { createMultiStepFormError } from './multi-step-form-error.js';

const context = type({
  scope: "'update'",
  targetStep: 'string',
  fields: 'unknown',
  strict: 'boolean',
  partial: 'boolean',
  mismatches: type('object[]').as<path.Mismatch[]>(),
  mismatchDetails: 'string',
});

export type UpdateMismatchContext = typeof context.infer;

/** Thrown when an update's values do not match the step's current shape. */
export class UpdateMismatchError extends createMultiStepFormError({
  code: 'updateMismatch',
  scope: 'update',
})
  .defineContext(context)
  .implement(
    ({ context, scope }) =>
      `[${scope}]: value mismatches for targetStep="${context.targetStep}", fields=${JSON.stringify(
        context.fields,
      )}, strict=${context.strict}, partial=${context.partial}
${context.mismatchDetails}`,
  ) {}
