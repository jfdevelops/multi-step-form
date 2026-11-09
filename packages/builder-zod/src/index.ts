import { z } from 'zod';
import { createSchemaBuilder } from '@jfdevelops/multi-step-form-builder-core';

/** Builds step schemas with zod (v4). */
export const zodSchemaBuilder = createSchemaBuilder({
  module: z,
  import: { name: 'z', from: 'zod' },
  kinds: {
    string: (node, ctx) =>
      ctx.chain(node, ctx.lib.string(node.message), {
        minLength: (schema, check, message) => schema.min(check.value, message),
        maxLength: (schema, check, message) => schema.max(check.value, message),
        length: (schema, check, message) => schema.length(check.value, message),
        email: (schema, _check, message) => schema.regex(ctx.email, message),
        uuid: (schema, _check, message) => schema.regex(ctx.uuid, message),
        url: (schema, _check, message) => schema.refine(ctx.isUrl, message),
        pattern: (schema, check, message) => schema.regex(ctx.pattern(check), message),
      }),
    number: (node, ctx) =>
      ctx.chain(node, ctx.lib.number(node.message), {
        min: (schema, check, message) => schema.min(Number(check.value), message),
        max: (schema, check, message) => schema.max(Number(check.value), message),
        integer: (schema, _check, message) => schema.int(message),
      }),
    boolean: (node, { lib }) => lib.boolean(node.message),
    date: (node, ctx) =>
      ctx.chain(node, ctx.lib.date(node.message), {
        min: (schema, check, message) => schema.min(new Date(check.value), message),
        max: (schema, check, message) => schema.max(new Date(check.value), message),
      }),
    literal: (node, { lib }) => lib.literal(node.value, node.message),
    enum: (node, { lib }) => lib.literal(node.values, node.message),
    array: (node, ctx) =>
      ctx.chain(node, ctx.lib.array(ctx.field(node.item), node.message), {
        minLength: (schema, check, message) => schema.min(check.value, message),
        maxLength: (schema, check, message) => schema.max(check.value, message),
        length: (schema, check, message) => schema.length(check.value, message),
      }),
    record: (node, { lib, field }) => lib.record(lib.string(), field(node.value), node.message),
    union: (node, { lib, field }) => lib.union(node.options.map(field), node.message),
    unknown: (_node, { lib }) => lib.unknown(),
  },
  object: (entries, { lib }) => lib.object(Object.fromEntries(entries.map((entry) => [entry.key, entry.schema]))),
  nullable: (schema) => schema.nullable(),
  optional: (schema, node, { lib, allowsEmptyString }) =>
    allowsEmptyString(node) ? schema.or(lib.literal('')).optional() : schema.optional(),
  refine: (schema, refinements, ctx) =>
    schema.superRefine(
      ctx.fn(
        (values: Record<string, unknown>, issues: z.RefinementCtx) => {
          for (const refinement of refinements) {
            if (values[refinement.field] !== values[refinement.equals]) {
              issues.addIssue({ code: 'custom', message: refinement.message, path: [refinement.field] });
            }
          }
        },
        `(values, ctx) => {\n${refinements
          .map(
            (refinement) =>
              `  if (values[${JSON.stringify(refinement.field)}] !== values[${JSON.stringify(refinement.equals)}]) {\n    ctx.addIssue({ code: 'custom', message: ${JSON.stringify(refinement.message)}, path: [${JSON.stringify(refinement.field)}] });\n  }`,
          )
          .join('\n')}\n}`,
      ),
    ),
  // zod schemas are Standard Schemas.
  standard: (schema) => schema,
});

/**
 * Compiles step schemas into zod (v4) schemas.
 *
 * ```ts
 * import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';
 *
 * const registry = createRegistry({ validators: [zodAdapter] });
 * ```
 */
export const zodAdapter = zodSchemaBuilder.createAdapter({ library: 'zod', label: 'Zod' });
