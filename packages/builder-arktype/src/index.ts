import { type } from 'arktype';
import { createSchemaBuilder } from '@jfdevelops/multi-step-form-builder-core';

interface NarrowContext {
  reject(issue: { message: string; path?: string[] }): false;
}

/**
 * Builds step types with ArkType (v2), combining built types with `type.or` and tuple expressions
 * (`[def, ':', predicate]`). Checks keep the builder's messages, and ArkType reports the first
 * failing check of each value.
 */
export const arktypeSchemaBuilder = createSchemaBuilder({
  module: type,
  import: { name: 'type', from: 'arktype' },
  kinds: {
    string: (_node, { lib }) => lib('string'),
    number: (_node, { lib }) => lib('number'),
    boolean: (_node, { lib }) => lib('boolean'),
    date: (_node, { lib }) => lib('Date'),
    literal: (node, { lib }) => lib.unit(node.value),
    enum: (node, { lib }) => lib.enumerated(...node.values),
    array: (node, { lib, field }) => lib.or(field(node.item)).array(),
    record: (node, { lib, field }) => lib.Record('string', field(node.value)),
    union: (node, { lib, field }) => lib.or(...node.options.map(field)),
    unknown: (_node, { lib }) => lib('unknown'),
  },
  // ArkType reports a union's branches rather than a narrow's message, so `null`, `undefined` and
  // `''` join the type before the checks, which skip them. `nullable`/`optional` are then no-ops.
  checks(schema, node, ctx) {
    const { lib } = ctx;
    const allowed = [
      ...(node.nullable
        ? [{ type: lib.null, test: (value: unknown) => value === null, code: 'value === null' }]
        : []),
      ...(node.optional
        ? [
            {
              type: lib.undefined,
              test: (value: unknown) => value === undefined,
              code: 'value === undefined',
            },
          ]
        : []),
      ...(node.optional && ctx.allowsEmptyString(node)
        ? [{ type: lib.unit(''), test: (value: unknown) => value === '', code: "value === ''" }]
        : []),
    ];
    const described = node.message === undefined ? schema : lib([schema, '@', { message: node.message }]);
    const base = allowed.length > 0 ? lib.or(described, ...allowed.map((entry) => entry.type)) : described;
    const guard = allowed.map((entry) => `${entry.code} || `).join('');

    return (node.checks ?? []).reduce((current, check) => {
      if (check.check === 'equalsField') return current;

      const predicate = ctx.predicate(check, node);
      const message = ctx.message(check, node);

      return lib([
        current,
        ':',
        ctx.fn(
          (value: unknown, issues: NarrowContext) =>
            allowed.some((entry) => entry.test(value)) || predicate.test(value) || issues.reject({ message }),
          `(value, ctx) => ${guard}${predicate.code} || ctx.reject({ message: ${JSON.stringify(message)} })`,
        ),
      ]);
    }, base);
  },
  // Optional keys are marked with `?`.
  object: (entries, { lib }) =>
    lib(
      Object.fromEntries(
        entries.map((entry) => [entry.optional ? `${entry.key}?` : entry.key, entry.schema]),
      ),
    ),
  nullable: (schema) => schema,
  optional: (schema) => schema,
  refine: (schema, refinements, ctx) =>
    refinements.reduce(
      (result, refinement) =>
        result.narrow(
          ctx.fn(
            (input: unknown, issues: NarrowContext) => {
              const values = input as Record<string, unknown>;

              return (
                values[refinement.field] === values[refinement.equals] ||
                issues.reject({ message: refinement.message, path: [refinement.field] })
              );
            },
            `(values, ctx) => values[${JSON.stringify(refinement.field)}] === values[${JSON.stringify(refinement.equals)}] || ctx.reject({ message: ${JSON.stringify(refinement.message)}, path: [${JSON.stringify(refinement.field)}] })`,
          ),
        ),
      schema,
    ),
  // ArkType types are Standard Schemas.
  standard: (schema) => schema,
});

/**
 * Compiles step schemas into ArkType (v2) types.
 *
 * ```ts
 * import { arktypeAdapter } from '@jfdevelops/multi-step-form-builder-arktype';
 *
 * const registry = createRegistry({ validators: [arktypeAdapter] });
 * ```
 */
export const arktypeAdapter = arktypeSchemaBuilder.createAdapter({
  library: 'arktype',
  label: 'ArkType',
  supportsTypeInference: true,
});
