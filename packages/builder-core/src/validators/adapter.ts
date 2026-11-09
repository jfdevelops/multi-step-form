import type { StandardSchemaV1 } from '@standard-schema/spec';
import { CHECKS_BY_KIND, type SchemaNode } from '../schema.js';
import { compilePattern } from './checks.js';
import type {
  EmittedValidator,
  ResolvedStepSchema,
  StepValues,
  ValidatorAdapter,
} from './types.js';

export type CreateValidatorAdapterBuildFn<TReturn> = (
  spec: ResolvedStepSchema,
) => TReturn;

/**
 * The options for one adapter. `compile` and `emit` receive what the adapter's build callback
 * returned for the same spec, so a step is only built once.
 */
export interface ValidatorAdapterOptions<TBuilt> {
  /** The value stored in `StepValidation.library`, e.g. `'zod'`. */
  library: string;
  /** The name shown in a library picker. */
  label: string;
  /**
   * npm packages the emitted code imports, so an editor can load their types. A function receives
   * `library`, e.g. `(library) => [library]`.
   */
  packages: readonly string[] | ((library: string) => readonly string[]);
  /**
   * Returns `true`, or a reason the library can't express `node`. Checks the node's kind doesn't
   * accept and unusable patterns are already reported.
   */
  supports?(node: SchemaNode): true | string;
  /** Returns the runtime validator. */
  compile(
    spec: ResolvedStepSchema,
    built: TBuilt,
  ): StandardSchemaV1<StepValues, StepValues>;
  /** Returns the validator's source code. */
  emit(spec: ResolvedStepSchema, built: TBuilt): EmittedValidator;
}

export type CreatedValidatorAdapter<TBuilt> = (
  options: ValidatorAdapterOptions<TBuilt>,
) => ValidatorAdapter;

function genericSupport(node: SchemaNode) {
  for (const check of node.checks ?? []) {
    if (!CHECKS_BY_KIND[node.kind].includes(check.check)) {
      return `"${check.check}" can't be used on a ${node.kind} value`;
    }

    if (check.check === 'pattern') {
      const compiled = compilePattern(check);

      if (typeof compiled === 'string') {
        return compiled;
      }
    }
  }

  return true;
}

/**
 * Creates an adapter factory around a build function. The build runs once per spec, and its
 * result is passed to `compile` and `emit`.
 *
 * ```ts
 * const createZodAdapter = createValidatorAdapter((spec) => build(spec));
 *
 * export const zodAdapter = createZodAdapter({
 *   library: 'zod',
 *   label: 'Zod',
 *   packages: ['zod'],
 *   compile: (_spec, built) => built.schema,
 *   emit: (_spec, built) => ({ imports: ["import { z } from 'zod';"], declarations: built.declarations, code: built.code }),
 * });
 * ```
 */
export function createValidatorAdapter<TBuilt>(
  build: CreateValidatorAdapterBuildFn<TBuilt>,
) {
  const createValidatorAdapter: CreatedValidatorAdapter<TBuilt> = ({
    library,
    label,
    packages,
    supports,
    compile,
    emit,
  }) => {
    const cache = new WeakMap<ResolvedStepSchema, TBuilt>();
    // `compile` and `emit` are usually called with the same spec; the cache runs `build` once per spec.
    const built: CreateValidatorAdapterBuildFn<NonNullable<TBuilt>> = (
      spec,
    ) => {
      if (!cache.has(spec)) {
        cache.set(spec, build(spec));
      }

      return cache.get(spec)!;
    };

    return {
      library,
      label,
      packages: typeof packages === 'function' ? packages(library) : packages,
      supports(node) {
        const generic = genericSupport(node);

        return generic === true ? (supports?.(node) ?? true) : generic;
      },
      compile: (spec) => compile(spec, built(spec)),
      emit: (spec) => emit(spec, built(spec)),
    };
  };

  return createValidatorAdapter;
}
