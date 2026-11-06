import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { FieldCheck, FieldSchemaSpec } from '../definition.js';
import type {
  ResolvedStepSpec,
  StepValues,
  ValidatorAdapter,
} from './types.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Upper bound on author-provided patterns, to limit pathological regular expressions. */
export const MAX_PATTERN_LENGTH = 500;

/** Whether a value counts as "not provided": `undefined`, `null`, `''` or `[]`. */
export function isEmptyValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Compiles a `pattern` check, returning a reason string when it is unusable. */
export function compilePattern(
  check: Extract<FieldCheck, { check: 'pattern' }>,
): RegExp | string {
  if (check.value.length > MAX_PATTERN_LENGTH) {
    return `Pattern is longer than ${MAX_PATTERN_LENGTH} characters`;
  }

  try {
    return new RegExp(check.value, check.flags);
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid pattern';
  }
}

function toTime(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value).getTime();
  }

  return Number.NaN;
}

function matchesType(spec: FieldSchemaSpec, value: unknown) {
  switch (spec.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return !Number.isNaN(toTime(value));
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'unknown':
      return true;
  }
}

function lengthOf(value: unknown) {
  return typeof value === 'string' || Array.isArray(value)
    ? value.length
    : undefined;
}

function compareBound(
  spec: FieldSchemaSpec,
  value: unknown,
  bound: number | string,
) {
  if (spec.type === 'date') {
    return toTime(value) - toTime(bound);
  }

  return Number(value) - Number(bound);
}

export function defaultCheckMessage(check: FieldCheck) {
  switch (check.check) {
    case 'minLength':
      return `Must be at least ${check.value} characters`;
    case 'maxLength':
      return `Must be at most ${check.value} characters`;
    case 'length':
      return `Must be exactly ${check.value} characters`;
    case 'min':
      return `Must be at least ${check.value}`;
    case 'max':
      return `Must be at most ${check.value}`;
    case 'email':
      return 'Must be a valid email address';
    case 'url':
      return 'Must be a valid URL';
    case 'uuid':
      return 'Must be a valid UUID';
    case 'integer':
      return 'Must be a whole number';
    case 'pattern':
      return 'Has an invalid format';
    case 'oneOf':
      return 'Must be one of the allowed values';
    case 'equalsField':
      return `Must match ${check.field}`;
  }
}

/** Runs one check. Returns `true` when it passes. */
export function runCheck(
  spec: FieldSchemaSpec,
  check: FieldCheck,
  value: unknown,
  values: StepValues,
  pattern?: RegExp,
): boolean {
  switch (check.check) {
    case 'minLength':
      return (lengthOf(value) ?? 0) >= check.value;
    case 'maxLength':
      return (lengthOf(value) ?? 0) <= check.value;
    case 'length':
      return lengthOf(value) === check.value;
    case 'min':
      return compareBound(spec, value, check.value) >= 0;
    case 'max':
      return compareBound(spec, value, check.value) <= 0;
    case 'email':
      return typeof value === 'string' && EMAIL_PATTERN.test(value);
    case 'url':
      if (typeof value !== 'string') return false;
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    case 'uuid':
      return typeof value === 'string' && UUID_PATTERN.test(value);
    case 'integer':
      return Number.isInteger(value);
    case 'pattern':
      return typeof value === 'string' && pattern !== undefined
        ? pattern.test(value)
        : false;
    case 'oneOf':
      return Array.isArray(value)
        ? value.every((item) => check.values.includes(item as never))
        : check.values.includes(value as never);
    case 'equalsField': {
      const other = values[check.field];

      return value instanceof Date || other instanceof Date
        ? toTime(value) === toTime(other)
        : value === other;
    }
  }
}

/**
 * Creates a synchronous Standard Schema validator from resolved step rules, with no third-party
 * dependencies.
 */
export function createBuiltinValidator(
  spec: ResolvedStepSpec,
): StandardSchemaV1<StepValues, StepValues> {
  const patterns = new Map<FieldCheck, RegExp>();

  for (const field of Object.values(spec)) {
    for (const check of field.checks ?? []) {
      if (check.check === 'pattern') {
        const compiled = compilePattern(check);

        if (compiled instanceof RegExp) {
          patterns.set(check, compiled);
        }
      }
    }
  }

  return {
    '~standard': {
      version: 1,
      vendor: 'multi-step-form-builder',
      validate(input) {
        if (typeof input !== 'object' || input === null) {
          return { issues: [{ message: 'Expected an object' }] };
        }

        const values = input as StepValues;
        const issues: StandardSchemaV1.Issue[] = [];

        for (const [key, field] of Object.entries(spec)) {
          const value = values[key];

          if (isEmptyValue(value)) {
            if (!field.optional) {
              issues.push({ message: field.message ?? 'Required', path: [key] });
            }

            continue;
          }

          if (!matchesType(field, value)) {
            issues.push({
              message: field.message ?? `Expected a ${field.type}`,
              path: [key],
            });
            continue;
          }

          for (const check of field.checks ?? []) {
            if (!runCheck(field, check, value, values, patterns.get(check))) {
              issues.push({
                message: check.message ?? defaultCheckMessage(check),
                path: [key],
              });
            }
          }
        }

        return issues.length > 0 ? { issues } : { value: values };
      },
    },
  };
}

/** The dependency-free adapter used for `library: 'builtin'` and `kind: 'required'`. */
export const builtinAdapter: ValidatorAdapter = {
  library: 'builtin',
  label: 'Built-in',
  supports(spec) {
    for (const check of spec.checks ?? []) {
      if (check.check === 'pattern') {
        const compiled = compilePattern(check);

        if (typeof compiled === 'string') {
          return compiled;
        }
      }
    }

    return true;
  },
  compile: createBuiltinValidator,
  emit(spec) {
    return {
      imports: [
        "import { createBuiltinValidator } from '@jfdevelops/multi-step-form-builder-core';",
      ],
      declarations: [],
      code: `createBuiltinValidator(${JSON.stringify(spec, null, 2)})`,
    };
  },
};
