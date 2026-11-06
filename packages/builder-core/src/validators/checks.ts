import type { SchemaCheck, SchemaNode } from '../schema.js';

/** The patterns every adapter uses for `email` and `uuid`, so all libraries behave the same. */
export const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;

/** Upper bound on author-provided patterns, to limit pathological regular expressions. */
export const MAX_PATTERN_LENGTH = 500;

/** Compiles a `pattern` check, returning a reason string when it is unusable. */
export function compilePattern(
  check: Extract<SchemaCheck, { check: 'pattern' }>,
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

export function isUrl(value: unknown) {
  if (typeof value !== 'string') return false;

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Whether a value counts as "not provided": `undefined`, `null`, `''` or `[]`. */
export function isEmptyValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function describeBound(node: SchemaNode | undefined, value: number | string) {
  return node?.kind === 'date' ? new Date(value).toLocaleDateString('en-US') : String(value);
}

/** The message a check reports when it has no `message` of its own. */
export function defaultCheckMessage(check: SchemaCheck, node?: SchemaNode) {
  const items = node?.kind === 'array' ? 'items' : 'characters';

  switch (check.check) {
    case 'minLength':
      return check.value === 1 && node?.kind !== 'array'
        ? 'Required'
        : `Must have at least ${check.value} ${items}`;
    case 'maxLength':
      return `Must have at most ${check.value} ${items}`;
    case 'length':
      return `Must have exactly ${check.value} ${items}`;
    case 'min':
      return node?.kind === 'date'
        ? `Must be on or after ${describeBound(node, check.value)}`
        : `Must be at least ${check.value}`;
    case 'max':
      return node?.kind === 'date'
        ? `Must be on or before ${describeBound(node, check.value)}`
        : `Must be at most ${check.value}`;
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
    case 'equalsField':
      return `Must match ${check.field}`;
  }
}

/** Whether a node's "nothing entered" value is the empty string, e.g. text and choices. */
export function allowsEmptyString(node: SchemaNode) {
  return (
    node.kind === 'string' ||
    (node.kind === 'enum' && node.values.some((value) => typeof value === 'string')) ||
    (node.kind === 'literal' && typeof node.value === 'string')
  );
}
