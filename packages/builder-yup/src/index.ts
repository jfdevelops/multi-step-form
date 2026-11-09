import * as yup from 'yup';
import {
  createSchemaBuilder,
  printExpr,
  unwrapExpr,
} from '@jfdevelops/multi-step-form-builder-core';

interface YupError {
  message: string;
  path?: string;
  inner?: YupError[];
}

function toPath(path: string | undefined) {
  return path ? path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean) : undefined;
}

/**
 * Wraps a yup schema in a synchronous Standard Schema validator. Yup's own `~standard` is
 * asynchronous, and multi-step form completeness is checked synchronously.
 */
export function toStandardSchema(schema: yup.Schema) {
  return {
    '~standard': {
      version: 1 as const,
      vendor: 'yup',
      validate(value: unknown) {
        try {
          return { value: schema.validateSync(value, { abortEarly: false, strict: true }) };
        } catch (error) {
          if (!(error instanceof yup.ValidationError)) throw error;

          const errors = error.inner.length > 0 ? error.inner : [error];

          return {
            issues: errors.map((entry) => ({ message: entry.message, path: toPath(entry.path) })),
          };
        }
      },
    },
  };
}

/** The same wrapper, as typed source for generated modules. */
const TO_STANDARD_CODE = `<T extends yup.Schema>(schema: T) => ({
  '~standard': {
    version: 1 as const,
    vendor: 'yup',
    validate(value: unknown) {
      try {
        return { value: schema.validateSync(value, { abortEarly: false, strict: true }) as yup.InferType<T> };
      } catch (error) {
        if (!(error instanceof yup.ValidationError)) throw error;

        const errors = error.inner.length > 0 ? error.inner : [error];

        return {
          issues: errors.map((entry) => ({
            message: entry.message,
            path: entry.path ? entry.path.replace(/\\[(\\d+)\\]/g, '.$1').split('.').filter(Boolean) : undefined,
          })),
        };
      }
    },
  },
})`;

const STRICT = { strict: true };

/** Builds step schemas with yup (v1), validated synchronously in strict mode. */
export const yupSchemaBuilder = createSchemaBuilder({
  module: yup,
  import: { name: 'yup', from: 'yup', kind: 'namespace' },
  kinds: {
    string: (node, ctx) =>
      ctx.chain(node, ctx.lib.string(), {
        // Yup keeps one test per name, so "required" isn't a second `min`.
        minLength: (schema, check, message) =>
          check.value === 1 ? schema.required(message) : schema.min(check.value, message),
        maxLength: (schema, check, message) => schema.max(check.value, message),
        length: (schema, check, message) => schema.length(check.value, message),
        email: (schema, _check, message) => schema.matches(ctx.email, message),
        uuid: (schema, _check, message) => schema.matches(ctx.uuid, message),
        url: (schema, check, message) => {
          const predicate = ctx.predicate(check, node);

          return schema.test(
            'url',
            message,
            ctx.fn((value: string | undefined) => value === undefined || predicate.test(value), `(value) => value === undefined || ${predicate.code}`),
          );
        },
        pattern: (schema, check, message) => schema.matches(ctx.pattern(check), message),
      }),
    number: (node, ctx) =>
      ctx.chain(node, ctx.lib.number(), {
        min: (schema, check, message) => schema.min(Number(check.value), message),
        max: (schema, check, message) => schema.max(Number(check.value), message),
        integer: (schema, _check, message) => schema.integer(message),
      }),
    boolean: (_node, { lib }) => lib.boolean(),
    date: (node, ctx) =>
      ctx.chain(node, ctx.lib.date(), {
        min: (schema, check, message) => schema.min(new Date(check.value), message),
        max: (schema, check, message) => schema.max(new Date(check.value), message),
      }),
    literal: (node, { lib }) => lib.mixed().oneOf([node.value], node.message ?? `Must be ${JSON.stringify(node.value)}`),
    enum: (node, { lib }) => lib.mixed().oneOf(node.values, node.message ?? 'Must be one of the allowed values'),
    array: (node, ctx) =>
      ctx.chain(node, ctx.lib.array(ctx.field(node.item)), {
        minLength: (schema, check, message) => schema.min(check.value, message),
        maxLength: (schema, check, message) => schema.max(check.value, message),
        length: (schema, check, message) => schema.length(check.value, message),
      }),
    record(node, ctx) {
      const value = ctx.field(node.value);
      const runtime: yup.Schema = unwrapExpr(value);

      return ctx.lib.object().test(
        'record',
        node.message ?? 'Must be an object',
        ctx.fn(
          (input: Record<string, unknown> | undefined, test: yup.TestContext) => {
            for (const [key, item] of Object.entries(input ?? {})) {
              try {
                runtime.validateSync(item, STRICT);
              } catch (error) {
                return test.createError({ path: `${test.path}.${key}`, message: (error as YupError).message });
              }
            }

            return true;
          },
          `(input, test) => {\n  for (const [key, item] of Object.entries(input ?? {})) {\n    try {\n      ${printExpr(value).replace(/\n/g, '\n      ')}.validateSync(item, { strict: true });\n    } catch (error) {\n      return test.createError({ path: \`\${test.path}.\${key}\`, message: (error as yup.ValidationError).message });\n    }\n  }\n  return true;\n}`,
        ),
      );
    },
    union(node, ctx) {
      const options = node.options.map(ctx.field);
      const runtime: yup.Schema[] = options.map(unwrapExpr);

      return ctx.lib.mixed().test(
        'union',
        node.message ?? 'Does not match any allowed shape',
        ctx.fn(
          (input: unknown) => input === undefined || runtime.some((option) => option.isValidSync(input, STRICT)),
          `(input) => input === undefined || [${options.map((option) => printExpr(option)).join(', ')}].some((schema) => schema.isValidSync(input, { strict: true }))`,
        ),
      );
    },
    unknown: (_node, { lib }) => lib.mixed(),
  },
  // Every kind gets its type error message, and is required unless `optional` says otherwise.
  checks(schema, node) {
    if (node.kind === 'unknown') return schema;

    const typed = node.message === undefined ? schema : schema.typeError(node.message);

    return typed.defined(node.message ?? 'Required');
  },
  object: (entries, { lib }) => lib.object(Object.fromEntries(entries.map((entry) => [entry.key, entry.schema]))),
  nullable: (schema) => schema.nullable(),
  optional(schema, node, ctx) {
    const optional = schema.optional();

    if (!ctx.allowsEmptyString(node)) return optional;

    // Accept '' (nothing entered) without running the value's checks.
    const runtime = unwrapExpr(optional);
    const empty = yup.string();

    return ctx.lib.lazy(
      ctx.fn(
        (value: unknown) => (value === '' ? empty : runtime),
        `(value) => (value === '' ? yup.string() : ${printExpr(optional).replace(/\n/g, '\n  ')})`,
      ),
    );
  },
  refine: (schema, refinements, ctx) =>
    refinements.reduce(
      (result, refinement) =>
        result.test(
          `${refinement.field}-equals-${refinement.equals}`,
          refinement.message,
          ctx.fn(
            (values: Record<string, unknown> | undefined, test: yup.TestContext) =>
              values?.[refinement.field] === values?.[refinement.equals] ||
              test.createError({ path: refinement.field, message: refinement.message }),
            `(values, test) => values?.[${JSON.stringify(refinement.field)}] === values?.[${JSON.stringify(refinement.equals)}] || test.createError({ path: ${JSON.stringify(refinement.field)}, message: ${JSON.stringify(refinement.message)} })`,
          ),
        ),
      schema,
    ),
  standard: (schema, ctx) => ctx.declare('toStandardSchema', toStandardSchema, TO_STANDARD_CODE)(schema),
});

/**
 * Compiles step schemas into yup (v1) schemas.
 *
 * ```ts
 * import { yupAdapter } from '@jfdevelops/multi-step-form-builder-yup';
 *
 * const registry = createRegistry({ validators: [yupAdapter] });
 * ```
 */
export const yupAdapter = yupSchemaBuilder.createAdapter({ library: 'yup', label: 'Yup' });
