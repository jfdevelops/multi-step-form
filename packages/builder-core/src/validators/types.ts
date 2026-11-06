import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SchemaNode } from '../schema.js';

/**
 * A field ready to be compiled: its root schema already reflects `isRequired` (required text and
 * lists must be non-empty, optional fields are `optional`), and `equalsField` checks have moved
 * to {@linkcode ResolvedStepSchema.refinements}.
 */
export interface ResolvedField {
  key: string;
  schema: SchemaNode;
}

/** A step-level rule: `field` must equal `equals`. */
export interface EqualsRefinement {
  field: string;
  equals: string;
  message: string;
}

/** Everything an adapter needs to build one step's validator. */
export interface ResolvedStepSchema {
  fields: ResolvedField[];
  refinements: EqualsRefinement[];
}

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

/** A compiled validator together with the source code that produces it. */
export interface BuiltValidator extends EmittedValidator {
  validator: StandardSchemaV1<StepValues, StepValues>;
}

/**
 * Turns library-agnostic schemas into a validator for one specific library. Create one with
 * `createValidatorAdapter`.
 *
 * `compile` and `emit` may be called with the same spec; adapters made with
 * `createValidatorAdapter` build it once.
 *
 * Validators must be **synchronous** Standard Schema validators: multi-step form completeness is
 * evaluated synchronously.
 */
export interface ValidatorAdapter {
  /** The value stored in `StepValidation.library`, e.g. `'zod'`. */
  readonly library: string;
  /** The name shown in a library picker. */
  readonly label: string;
  /** npm packages the emitted code imports, so an editor can load their types. */
  readonly packages: readonly string[];
  /** Returns `true`, or a reason the library can't express this node. Called for every node. */
  supports(node: SchemaNode): true | string;
  /** Builds a runtime validator. */
  compile(spec: ResolvedStepSchema): StandardSchemaV1<StepValues, StepValues>;
  /** Writes source code for the validator, for code export. */
  emit(spec: ResolvedStepSchema): EmittedValidator;
}
