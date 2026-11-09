import { Schema } from 'effect';
import { createSchemaBuilder } from '@jfdevelops/multi-step-form-builder-core';

/** Builds step schemas with Effect (v4), wrapped with `Schema.toStandardSchemaV1`. */
export const effectSchemaBuilder = createSchemaBuilder({
  module: Schema,
  import: { name: 'Schema', from: 'effect' },
  kinds: {
    string: (_node, { lib }) => lib.String,
    number: (_node, { lib }) => lib.Number,
    boolean: (_node, { lib }) => lib.Boolean,
    date: (_node, { lib }) => lib.Date,
    literal: (node, { lib }) => lib.Literal(node.value),
    enum: (node, { lib }) => lib.Literals(node.values),
    array: (node, { lib, field }) => lib.Array(field(node.item)),
    record: (node, { lib, field }) => lib.Record(lib.String, field(node.value)),
    union: (node, { lib, field }) => lib.Union(node.options.map(field)),
    unknown: (_node, { lib }) => lib.Unknown,
  },
  // Every kind gets its message and checks the same way: as an annotation and as filters.
  checks(schema, node, ctx) {
    const described = node.message === undefined ? schema : schema.annotate({ message: node.message });
    const [first, ...rest] = (node.checks ?? []).flatMap((check) => {
      if (check.check === 'equalsField') return [];

      const predicate = ctx.predicate(check, node);

      return [
        ctx.lib.makeFilter(ctx.fn(predicate.test, `(value) => ${predicate.code}`), {
          message: ctx.message(check, node),
        }),
      ];
    });

    return first ? described.check(first, ...rest) : described;
  },
  object: (entries, { lib }) => lib.Struct(Object.fromEntries(entries.map((entry) => [entry.key, entry.schema]))),
  nullable: (schema, _node, { lib }) => lib.NullOr(schema),
  optional: (schema, node, { lib, allowsEmptyString }) =>
    lib.optional(allowsEmptyString(node) ? lib.Union([schema, lib.Literal('')]) : schema),
  refine: (schema, refinements, ctx) => {
    const [first, ...rest] = refinements.map((refinement) =>
      ctx.lib.makeFilter(
        ctx.fn(
          (input: unknown) => {
            const values = input as Record<string, unknown>;

            return values[refinement.field] === values[refinement.equals]
              ? undefined
              : { path: [refinement.field], issue: refinement.message };
          },
          `(values) => values[${JSON.stringify(refinement.field)}] === values[${JSON.stringify(refinement.equals)}] ? undefined : { path: [${JSON.stringify(refinement.field)}], issue: ${JSON.stringify(refinement.message)} }`,
        ),
      ),
    );

    return first ? schema.check(first, ...rest) : schema;
  },
  standard: (schema, { lib }) => lib.toStandardSchemaV1(schema),
});

/**
 * Compiles step schemas into Effect (v4) schemas.
 *
 * ```ts
 * import { effectAdapter } from '@jfdevelops/multi-step-form-builder-effect';
 *
 * const registry = createRegistry({ validators: [effectAdapter] });
 * ```
 */
export const effectAdapter = effectSchemaBuilder.createAdapter({ library: 'effect', label: 'Effect Schema' });
