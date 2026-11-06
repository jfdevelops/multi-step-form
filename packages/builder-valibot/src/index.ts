import * as v from 'valibot';
import { createSchemaBuilder, createValidatorAdapter } from '@jfdevelops/multi-step-form-builder-core';

/**
 * `v.pipe` is overloaded per number of items, which a list of checks can't pick, so it's called
 * through the variadic shape every overload shares.
 */
function pipe(lib: typeof v, schema: v.GenericSchema, items: readonly v.GenericPipeItem[]) {
  const variadic = lib.pipe as unknown as (schema: v.GenericSchema, ...items: v.GenericPipeItem[]) => v.GenericSchema;

  return items.length > 0 ? variadic(schema, ...items) : schema;
}

/** Builds step schemas with Valibot (v1). */
export const valibotSchemaBuilder = createSchemaBuilder({
  module: v,
  import: { name: 'v', from: 'valibot', kind: 'namespace' },
  kinds: {
    string: (node, ctx) =>
      pipe(
        ctx.lib,
        ctx.lib.string(node.message),
        ctx.actions(node, {
          minLength: (check, message) => ctx.lib.minLength(check.value, message),
          maxLength: (check, message) => ctx.lib.maxLength(check.value, message),
          length: (check, message) => ctx.lib.length(check.value, message),
          email: (_check, message) => ctx.lib.regex(ctx.email, message),
          uuid: (_check, message) => ctx.lib.regex(ctx.uuid, message),
          url: (_check, message) => ctx.lib.check(ctx.isUrl, message),
          pattern: (check, message) => ctx.lib.regex(ctx.pattern(check), message),
        }),
      ),
    number: (node, ctx) =>
      pipe(
        ctx.lib,
        ctx.lib.number(node.message),
        ctx.actions(node, {
          min: (check, message) => ctx.lib.minValue(Number(check.value), message),
          max: (check, message) => ctx.lib.maxValue(Number(check.value), message),
          integer: (_check, message) => ctx.lib.integer(message),
        }),
      ),
    boolean: (node, { lib }) => lib.boolean(node.message),
    date: (node, ctx) =>
      pipe(
        ctx.lib,
        ctx.lib.date(node.message),
        ctx.actions(node, {
          min: (check, message) => ctx.lib.minValue(new Date(check.value), message),
          max: (check, message) => ctx.lib.maxValue(new Date(check.value), message),
        }),
      ),
    literal: (node, { lib }) => lib.literal(node.value, node.message),
    enum: (node, { lib }) => lib.picklist(node.values, node.message),
    array: (node, ctx) =>
      pipe(
        ctx.lib,
        ctx.lib.array(ctx.field(node.item), node.message),
        ctx.actions(node, {
          minLength: (check, message) => ctx.lib.minLength(check.value, message),
          maxLength: (check, message) => ctx.lib.maxLength(check.value, message),
          length: (check, message) => ctx.lib.length(check.value, message),
        }),
      ),
    record: (node, { lib, field }) => lib.record(lib.string(), field(node.value), node.message),
    union: (node, { lib, field }) => lib.union(node.options.map(field), node.message),
    unknown: (_node, { lib }) => lib.unknown(),
  },
  object: (entries, { lib }) => lib.object(Object.fromEntries(entries.map((entry) => [entry.key, entry.schema]))),
  nullable: (schema, _node, { lib }) => lib.nullable(schema),
  optional: (schema, node, { lib, allowsEmptyString }) =>
    lib.optional(allowsEmptyString(node) ? lib.union([schema, lib.literal('')]) : schema),
  refine: (schema, refinements, ctx) =>
    pipe(
      ctx.lib,
      schema,
      refinements.map((refinement) =>
        ctx.lib.forward(
          ctx.lib.check(
            ctx.fn(
              (input: Record<string, unknown>) => input[refinement.field] === input[refinement.equals],
              `(input) => input[${JSON.stringify(refinement.field)}] === input[${JSON.stringify(refinement.equals)}]`,
            ),
            refinement.message,
          ),
          [refinement.field],
        ),
      ),
    ),
  // Valibot schemas are Standard Schemas.
  standard: (schema) => schema,
});

/**
 * Compiles step schemas into Valibot (v1) schemas.
 *
 * ```ts
 * import { valibotAdapter } from '@jfdevelops/multi-step-form-builder-valibot';
 *
 * const registry = createRegistry({ validators: [valibotAdapter] });
 * ```
 */
export const valibotAdapter = createValidatorAdapter(valibotSchemaBuilder.buildStepSchema)({
  library: 'valibot',
  label: 'Valibot',
  packages: (library) => [library],
  compile: (_spec, built) => built.schema,
  emit: (_spec, built) => built,
});
