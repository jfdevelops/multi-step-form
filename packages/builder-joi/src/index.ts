import Joi from 'joi';
import { createSchemaBuilder, createValidatorAdapter, isUrl } from '@jfdevelops/multi-step-form-builder-core';

/** The message key for a value of the wrong type, by kind. */
const BASE_MESSAGE_KEY: Partial<Record<string, string>> = {
  string: 'string.base',
  number: 'number.base',
  boolean: 'boolean.base',
  date: 'date.base',
  object: 'object.base',
  array: 'array.base',
  record: 'object.base',
  literal: 'any.only',
  enum: 'any.only',
};

/** Builds step schemas with Joi (v18), validated without type conversion. */
export const joiSchemaBuilder = createSchemaBuilder({
  module: Joi,
  import: { name: 'Joi', from: 'joi', kind: 'default' },
  kinds: {
    string: (node, ctx) =>
      ctx.chain(node, ctx.lib.string(), {
        minLength: (schema, check, message) => schema.min(check.value).message(message),
        maxLength: (schema, check, message) => schema.max(check.value).message(message),
        length: (schema, check, message) => schema.length(check.value).message(message),
        email: (schema, _check, message) => schema.pattern(ctx.email).message(message),
        uuid: (schema, _check, message) => schema.pattern(ctx.uuid).message(message),
        pattern: (schema, check, message) => schema.pattern(ctx.pattern(check)).message(message),
        url: (schema, _check, message) => {
          void ctx.isUrl;

          return schema
            .custom(
              ctx.fn(
                (value: unknown, helpers: Joi.CustomHelpers) => (isUrl(value) ? value : helpers.error('string.url')),
                "(value, helpers) => (isUrl(value) ? value : helpers.error('string.url'))",
              ),
            )
            .messages({ 'string.url': message });
        },
      }),
    number: (node, ctx) =>
      ctx.chain(node, ctx.lib.number(), {
        min: (schema, check, message) => schema.min(Number(check.value)).message(message),
        max: (schema, check, message) => schema.max(Number(check.value)).message(message),
        integer: (schema, _check, message) => schema.integer().message(message),
      }),
    boolean: (_node, { lib }) => lib.boolean(),
    date: (node, ctx) =>
      ctx.chain(node, ctx.lib.date(), {
        min: (schema, check, message) => schema.min(new Date(check.value)).message(message),
        max: (schema, check, message) => schema.max(new Date(check.value)).message(message),
      }),
    literal: (node, { lib }) => lib.valid(node.value),
    enum: (node, { lib }) => lib.valid(...node.values),
    array: (node, ctx) =>
      ctx.chain(node, ctx.lib.array().items(ctx.field(node.item)), {
        minLength: (schema, check, message) => schema.min(check.value).message(message),
        maxLength: (schema, check, message) => schema.max(check.value).message(message),
        length: (schema, check, message) => schema.length(check.value).message(message),
      }),
    record: (node, { lib, field }) => lib.object().pattern(lib.string(), field(node.value)),
    union: (node, { lib, field }) => lib.alternatives().try(...node.options.map(field)),
    unknown: (_node, { lib }) => lib.any(),
  },
  // Every kind gets its type message the same way. Joi rejects '' unless allowed: plain text
  // accepts it, and text with checks reports it with the first check's message.
  checks(schema, node, ctx) {
    const messages: Record<string, string> = {};
    const first = node.checks?.find((check) => check.check !== 'equalsField');
    const baseKey = BASE_MESSAGE_KEY[node.kind];

    if (node.message !== undefined) {
      messages['any.required'] = node.message;
      if (baseKey) messages[baseKey] = node.message;
    }

    if (node.kind === 'string' && first) messages['string.empty'] = ctx.message(first, node);

    const allowed = node.kind === 'string' && !first ? schema.allow('') : schema;

    return Object.keys(messages).length > 0 ? allowed.messages(messages) : allowed;
  },
  // Keys are required unless optional; list items, dictionary values and union options aren't keys.
  object: (entries, { lib }) =>
    lib.object(
      Object.fromEntries(entries.map((entry) => [entry.key, entry.optional ? entry.schema : entry.schema.required()])),
    ),
  nullable: (schema) => schema.allow(null),
  optional: (schema, node, { allowsEmptyString }) =>
    allowsEmptyString(node) ? schema.optional().allow('') : schema.optional(),
  // Joi compares a key with its siblings through `state.ancestors`.
  refine: (schema, refinements, ctx) =>
    schema.keys(
      Object.fromEntries(
        refinements.map((refinement) => [
          refinement.field,
          schema
            .extract(refinement.field)
            .custom(
              ctx.fn(
                (value: unknown, helpers: Joi.CustomHelpers) =>
                  value === helpers.state.ancestors[0]?.[refinement.equals] ? value : helpers.error('any.equalsField'),
                `(value, helpers) => (value === helpers.state.ancestors[0]?.[${JSON.stringify(refinement.equals)}] ? value : helpers.error('any.equalsField'))`,
              ),
            )
            .messages({ 'any.equalsField': refinement.message }),
        ]),
      ),
    ),
  standard: (schema) => schema.prefs({ abortEarly: false, convert: false }),
});

/**
 * Compiles step schemas into Joi (v18) schemas.
 *
 * ```ts
 * import { joiAdapter } from '@jfdevelops/multi-step-form-builder-joi';
 *
 * const registry = createRegistry({ validators: [joiAdapter] });
 * ```
 */
export const joiAdapter = createValidatorAdapter(joiSchemaBuilder.buildStepSchema)({
  library: 'joi',
  label: 'Joi',
  packages: (library) => [library],
  compile: (_spec, built) => built.schema,
  emit: (_spec, built) => built,
});
