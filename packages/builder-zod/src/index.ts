import { z } from 'zod';
import {
  compilePattern,
  defaultCheckMessage,
  isEmptyValue,
  runCheck,
  type FieldCheck,
  type FieldSchemaSpec,
  type ResolvedStepSpec,
  type StepValues,
  type ValidatorAdapter,
} from '@jfdevelops/multi-step-form-builder-core';

// Mirrors the built-in validator so a step behaves the same whichever library compiles it.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const literal = (value: unknown) => JSON.stringify(value);

function isUrl(value: unknown) {
  if (typeof value !== 'string') return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** A zod schema and the source code that produces the same schema. */
interface Built {
  schema: z.ZodType;
  code: string;
}

function baseFor(field: FieldSchemaSpec & { optional: boolean }): Built {
  const required = field.message ?? 'Required';
  const invalid = field.message ? literal(field.message) : 'undefined';
  const error = (issue: { input?: unknown }) =>
    issue.input === undefined ? required : field.message;
  const errorCode = `{ error: (issue) => (issue.input === undefined ? ${literal(required)} : ${invalid}) }`;

  switch (field.type) {
    case 'string':
      return { schema: z.string({ error }), code: `z.string(${errorCode})` };
    case 'number':
      return { schema: z.number({ error }), code: `z.number(${errorCode})` };
    case 'boolean':
      return { schema: z.boolean({ error }), code: `z.boolean(${errorCode})` };
    case 'date':
      return {
        schema: z.coerce.date({ error }),
        code: `z.coerce.date(${errorCode})`,
      };
    case 'array':
      return {
        schema: z.array(z.unknown(), { error }),
        code: `z.array(z.unknown(), ${errorCode})`,
      };
    case 'object':
      return {
        schema: z.record(z.string(), z.unknown(), { error }),
        code: `z.record(z.string(), z.unknown(), ${errorCode})`,
      };
    case 'unknown':
      return { schema: z.unknown(), code: 'z.unknown()' };
  }
}

function applyCheck(
  field: FieldSchemaSpec,
  built: Built,
  check: Exclude<FieldCheck, { check: 'equalsField' }>,
): Built {
  const message = check.message ?? defaultCheckMessage(check);
  const m = literal(message);
  // The base schema type depends on `field.type`; the checks below only run on compatible
  // bases (see `zodAdapter.supports`), so the loose cast keeps this table readable.
  const schema = built.schema as any;

  switch (check.check) {
    case 'minLength':
      return { schema: schema.min(check.value, message), code: `${built.code}.min(${check.value}, ${m})` };
    case 'maxLength':
      return { schema: schema.max(check.value, message), code: `${built.code}.max(${check.value}, ${m})` };
    case 'length':
      return { schema: schema.length(check.value, message), code: `${built.code}.length(${check.value}, ${m})` };
    case 'min':
    case 'max': {
      if (field.type === 'date') {
        return {
          schema: schema[check.check](new Date(check.value), message),
          code: `${built.code}.${check.check}(new Date(${literal(check.value)}), ${m})`,
        };
      }

      const bound = Number(check.value);

      return {
        schema: schema[check.check](bound, message),
        code: `${built.code}.${check.check}(${bound}, ${m})`,
      };
    }
    case 'integer':
      return { schema: schema.int(message), code: `${built.code}.int(${m})` };
    case 'email':
      return { schema: schema.regex(EMAIL_PATTERN, message), code: `${built.code}.regex(${EMAIL_PATTERN}, ${m})` };
    case 'uuid':
      return { schema: schema.regex(UUID_PATTERN, message), code: `${built.code}.regex(${UUID_PATTERN}, ${m})` };
    case 'url':
      return { schema: schema.refine(isUrl, message), code: `${built.code}.refine(isUrl, ${m})` };
    case 'pattern': {
      const pattern = compilePattern(check);

      if (typeof pattern === 'string') {
        throw new TypeError(pattern);
      }

      return { schema: schema.regex(pattern, message), code: `${built.code}.regex(${pattern}, ${m})` };
    }
    case 'oneOf':
      return {
        schema: schema.refine(
          (value: unknown) => runCheck(field, check, value, {}),
          message,
        ),
        code: `${built.code}.refine((value) => oneOf(value, ${literal(check.values)}), ${m})`,
      };
  }
}

function buildField(field: FieldSchemaSpec & { optional: boolean }): Built {
  let built = baseFor(field);

  for (const check of field.checks ?? []) {
    if (check.check !== 'equalsField') {
      built = applyCheck(field, built, check);
    }
  }

  if (field.optional) {
    built = { schema: built.schema.optional(), code: `${built.code}.optional()` };
  }

  // Treat '', null and [] as "not provided", like the built-in validator.
  return {
    schema: z.preprocess(
      (value) => (isEmptyValue(value) ? undefined : value),
      built.schema,
    ),
    code: `z.preprocess((value) => (isEmpty(value) ? undefined : value), ${built.code})`,
  };
}

const DECLARATIONS = {
  isEmpty:
    "const isEmpty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);",
  isUrl:
    'const isUrl = (value) => { try { new URL(value); return true; } catch { return false; } };',
  oneOf:
    'const oneOf = (value, values) => (Array.isArray(value) ? value.every((item) => values.includes(item)) : values.includes(value));',
};

function build(spec: ResolvedStepSpec) {
  const shape: Record<string, z.ZodType> = {};
  const shapeCode: string[] = [];
  const declarations = new Set<string>([DECLARATIONS.isEmpty]);
  const equals: { key: string; check: Extract<FieldCheck, { check: 'equalsField' }> }[] = [];

  for (const [key, field] of Object.entries(spec)) {
    const built = buildField(field);
    shape[key] = built.schema;
    shapeCode.push(`  ${key}: ${built.code},`);

    for (const check of field.checks ?? []) {
      if (check.check === 'url') declarations.add(DECLARATIONS.isUrl);
      if (check.check === 'oneOf') declarations.add(DECLARATIONS.oneOf);
      if (check.check === 'equalsField') equals.push({ key, check });
    }
  }

  let schema = z.object(shape) as unknown as z.ZodType<StepValues, StepValues>;
  let code = `z.object({\n${shapeCode.join('\n')}\n})`;

  if (equals.length > 0) {
    schema = schema.superRefine((values, ctx) => {
      for (const { key, check } of equals) {
        if (!runCheck(spec[key]!, check, values[key], values)) {
          ctx.addIssue({
            code: 'custom',
            message: check.message ?? defaultCheckMessage(check),
            path: [key],
          });
        }
      }
    });
    const lines = equals.map(
      ({ key, check }) =>
        `  if (values.${key} !== values.${check.field}) ctx.addIssue({ code: 'custom', message: ${literal(check.message ?? defaultCheckMessage(check))}, path: [${literal(key)}] });`,
    );
    code += `.superRefine((values, ctx) => {\n${lines.join('\n')}\n})`;
  }

  return { schema, code, declarations: [...declarations] };
}

/**
 * Compiles step rules into zod (v4) schemas.
 *
 * ```ts
 * import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';
 *
 * const registry = createRegistry({ validators: [zodAdapter] });
 * ```
 */
export const zodAdapter: ValidatorAdapter = {
  library: 'zod',
  label: 'Zod',
  supports(spec) {
    for (const check of spec.checks ?? []) {
      if (check.check === 'pattern') {
        const pattern = compilePattern(check);

        if (typeof pattern === 'string') return pattern;
      }

      const lengthCheck =
        check.check === 'minLength' ||
        check.check === 'maxLength' ||
        check.check === 'length';

      if (lengthCheck && spec.type !== 'string' && spec.type !== 'array') {
        return `${check.check} needs a string or array field`;
      }

      if (
        (check.check === 'min' || check.check === 'max') &&
        spec.type !== 'number' &&
        spec.type !== 'date'
      ) {
        return `${check.check} needs a number or date field`;
      }

      if (check.check === 'integer' && spec.type !== 'number') {
        return 'integer needs a number field';
      }

      if (
        (check.check === 'email' || check.check === 'uuid' || check.check === 'url') &&
        spec.type !== 'string'
      ) {
        return `${check.check} needs a string field`;
      }
    }

    return true;
  },
  compile(spec) {
    return build(spec).schema;
  },
  emit(spec) {
    const { code, declarations } = build(spec);

    return { imports: ["import { z } from 'zod';"], declarations, code };
  },
};
