import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SchemaCheck, SchemaNode } from '../schema.js';
import { createValidatorAdapter } from './adapter.js';
import {
  allowsEmptyString,
  compilePattern,
  defaultCheckMessage,
  isUrl,
  PATTERNS,
} from './checks.js';
import type { ResolvedStepSchema, StepValues, ValidatorAdapter } from './types.js';

type Path = (string | number)[];

function toTime(value: unknown) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();

  return Number.NaN;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

function typeMatches(node: SchemaNode, value: unknown): boolean {
  switch (node.kind) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return value instanceof Date ? !Number.isNaN(value.getTime()) : false;
    case 'literal':
      return value === node.value;
    case 'enum':
      return node.values.includes(value as string | number);
    case 'object':
    case 'record':
      return isPlainObject(value);
    case 'array':
      return Array.isArray(value);
    case 'union':
    case 'unknown':
      return true;
  }
}

function typeMessage(node: SchemaNode) {
  switch (node.kind) {
    case 'enum':
      return 'Must be one of the allowed values';
    case 'literal':
      return `Must be ${JSON.stringify(node.value)}`;
    case 'date':
      return 'Must be a valid date';
    case 'object':
    case 'record':
      return 'Must be an object';
    case 'array':
      return 'Must be a list';
    default:
      return `Must be a ${node.kind}`;
  }
}

function lengthOf(value: unknown) {
  return typeof value === 'string' || Array.isArray(value) ? value.length : 0;
}

function passes(node: SchemaNode, check: SchemaCheck, value: unknown, patterns: Map<SchemaCheck, RegExp>) {
  switch (check.check) {
    case 'minLength':
      return lengthOf(value) >= check.value;
    case 'maxLength':
      return lengthOf(value) <= check.value;
    case 'length':
      return lengthOf(value) === check.value;
    case 'min':
      return node.kind === 'date' ? toTime(value) >= toTime(check.value) : Number(value) >= Number(check.value);
    case 'max':
      return node.kind === 'date' ? toTime(value) <= toTime(check.value) : Number(value) <= Number(check.value);
    case 'email':
      return typeof value === 'string' && PATTERNS.email.test(value);
    case 'uuid':
      return typeof value === 'string' && PATTERNS.uuid.test(value);
    case 'url':
      return isUrl(value);
    case 'integer':
      return Number.isInteger(value);
    case 'pattern': {
      const pattern = patterns.get(check);
      return typeof value === 'string' && pattern !== undefined && pattern.test(value);
    }
    case 'equalsField':
      // Handled at the step level.
      return true;
  }
}

function validateNode(
  node: SchemaNode,
  value: unknown,
  path: Path,
  issues: StandardSchemaV1.Issue[],
  patterns: Map<SchemaCheck, RegExp>,
) {
  if (value === null && node.nullable) return;
  if (node.optional && (value === undefined || (value === '' && allowsEmptyString(node)))) return;

  if (node.kind === 'union') {
    const matches = node.options.some((option) => {
      const optionIssues: StandardSchemaV1.Issue[] = [];
      validateNode(option, value, path, optionIssues, patterns);
      return optionIssues.length === 0;
    });

    if (!matches) issues.push({ message: node.message ?? 'Does not match any allowed shape', path });
    return;
  }

  if (!typeMatches(node, value)) {
    issues.push({ message: node.message ?? typeMessage(node), path });
    return;
  }

  for (const check of node.checks ?? []) {
    if (!passes(node, check, value, patterns)) {
      issues.push({ message: check.message ?? defaultCheckMessage(check, node), path });
    }
  }

  if (node.kind === 'object') {
    const object = value as Record<string, unknown>;
    for (const property of node.properties) {
      validateNode(property.schema, object[property.key], [...path, property.key], issues, patterns);
    }
  } else if (node.kind === 'record') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      validateNode(node.value, item, [...path, key], issues, patterns);
    }
  } else if (node.kind === 'array') {
    (value as unknown[]).forEach((item, index) =>
      validateNode(node.item, item, [...path, index], issues, patterns),
    );
  }
}

function collectPatterns(node: SchemaNode, patterns: Map<SchemaCheck, RegExp>) {
  for (const check of node.checks ?? []) {
    if (check.check === 'pattern') {
      const compiled = compilePattern(check);
      if (compiled instanceof RegExp) patterns.set(check, compiled);
    }
  }

  if (node.kind === 'object') node.properties.forEach((property) => collectPatterns(property.schema, patterns));
  if (node.kind === 'array') collectPatterns(node.item, patterns);
  if (node.kind === 'record') collectPatterns(node.value, patterns);
  if (node.kind === 'union') node.options.forEach((option) => collectPatterns(option, patterns));
}

/**
 * Creates a synchronous Standard Schema validator for a step, with no third-party dependencies.
 * This is what the `builtin` adapter compiles to, and what its exported code calls.
 */
export function createSchemaValidator(
  spec: ResolvedStepSchema,
): StandardSchemaV1<StepValues, StepValues> {
  const patterns = new Map<SchemaCheck, RegExp>();

  spec.fields.forEach((field) => collectPatterns(field.schema, patterns));

  return {
    '~standard': {
      version: 1,
      vendor: 'multi-step-form-builder',
      validate(input) {
        if (!isPlainObject(input)) {
          return { issues: [{ message: 'Expected an object' }] };
        }

        const issues: StandardSchemaV1.Issue[] = [];

        for (const field of spec.fields) {
          validateNode(field.schema, input[field.key], [field.key], issues, patterns);
        }

        for (const refinement of spec.refinements) {
          const value = input[refinement.field];
          const other = input[refinement.equals];
          const equal =
            value instanceof Date || other instanceof Date ? toTime(value) === toTime(other) : value === other;

          if (!equal) issues.push({ message: refinement.message, path: [refinement.field] });
        }

        return issues.length > 0 ? { issues } : { value: input };
      },
    },
  };
}

const createBuiltinAdapter = createValidatorAdapter((spec) => createSchemaValidator(spec));

/** The dependency-free adapter, used for `library: 'builtin'`. */
export const builtinAdapter: ValidatorAdapter = createBuiltinAdapter({
  library: 'builtin',
  label: 'Built-in',
  packages: ['@jfdevelops/multi-step-form-builder-core'],
  compile: (_spec, validator) => validator,
  emit: (spec) => ({
    imports: ["import { createSchemaValidator } from '@jfdevelops/multi-step-form-builder-core';"],
    declarations: [],
    code: `createSchemaValidator(${JSON.stringify(spec, null, 2)})`,
  }),
});
