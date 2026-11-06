import type { StandardSchemaV1 } from '@standard-schema/spec';
import { CHECKS_BY_KIND, type SchemaNode } from '../schema.js';
import { compilePattern } from './checks.js';
import type {
  EmittedValidator,
  ResolvedStepSchema,
  StepValues,
  ValidatorAdapter,
} from './types.js';

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
  compile(spec: ResolvedStepSchema, built: TBuilt): StandardSchemaV1<StepValues, StepValues>;
  /** Returns the validator's source code. */
  emit(spec: ResolvedStepSchema, built: TBuilt): EmittedValidator;
}

function genericSupport(node: SchemaNode): true | string {
  for (const check of node.checks ?? []) {
    if (!CHECKS_BY_KIND[node.kind].includes(check.check)) {
      return `"${check.check}" can't be used on a ${node.kind} value`;
    }

    if (check.check === 'pattern') {
      const compiled = compilePattern(check);

      if (typeof compiled === 'string') return compiled;
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
export function createValidatorAdapter<TBuilt>(build: (spec: ResolvedStepSchema) => TBuilt) {
  return (options: ValidatorAdapterOptions<TBuilt>): ValidatorAdapter => {
    const cache = new WeakMap<ResolvedStepSchema, TBuilt>();
    const built = (spec: ResolvedStepSchema) => {
      if (!cache.has(spec)) cache.set(spec, build(spec));

      return cache.get(spec)!;
    };

    return {
      library: options.library,
      label: options.label,
      packages:
        typeof options.packages === 'function' ? options.packages(options.library) : options.packages,
      supports(node) {
        const generic = genericSupport(node);

        return generic === true ? (options.supports?.(node) ?? true) : generic;
      },
      compile: (spec) => options.compile(spec, built(spec)),
      emit: (spec) => options.emit(spec, built(spec)),
    };
  };
}
