import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FieldSchemaSpec } from '../definition.js';

/** The rules for one step, keyed by field key, with `optional` already resolved. */
export type ResolvedStepSpec = Record<
  string,
  FieldSchemaSpec & { optional: boolean }
>;

/** The values a compiled step validator receives: the step's field values keyed by field key. */
export type StepValues = Record<string, unknown>;

export interface EmittedValidator {
  /** Import statements the code needs, e.g. `import { z } from 'zod';`. */
  imports: string[];
  /** Top-level declarations the expression depends on (helper functions, constants). */
  declarations: string[];
  /** A JavaScript expression that evaluates to the validator. */
  code: string;
}

/**
 * Turns library-agnostic field rules into a validator for one specific library.
 *
 * Adapters must produce **synchronous** Standard Schema validators: multi-step form completeness
 * is evaluated synchronously.
 */
export interface ValidatorAdapter {
  /** The value stored in `StepValidation.library`, e.g. `'zod'`. */
  readonly library: string;
  /** The name shown in a library picker. */
  readonly label: string;
  /** Returns `true`, or a reason the adapter cannot express `spec`. */
  supports(spec: FieldSchemaSpec): true | string;
  /** Builds a runtime validator. */
  compile(spec: ResolvedStepSpec): StandardSchemaV1<StepValues, StepValues>;
  /** Writes source code for the validator, for code export. */
  emit(spec: ResolvedStepSpec): EmittedValidator;
}
