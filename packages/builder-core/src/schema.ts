/**
 * The schema tree: a library-agnostic description of a value's shape and rules.
 *
 * Every field has one. It decides the TypeScript type of the field's default value, how the
 * default value is edited, and the validator a step compiles to with whichever Standard Schema
 * library the author picks. Like the rest of a definition, it is plain JSON.
 */
import type { JsonValue } from './definition.js';

export type SchemaKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'literal'
  | 'enum'
  | 'object'
  | 'array'
  | 'record'
  | 'union'
  | 'unknown';

/** A validation rule on a schema node. Which checks a node accepts depends on its kind. */
export type SchemaCheck = { message?: string } & (
  | { check: 'minLength' | 'maxLength' | 'length'; value: number }
  | { check: 'min' | 'max'; value: number | string }
  | { check: 'email' | 'url' | 'uuid' | 'integer' }
  | { check: 'pattern'; value: string; flags?: string }
  /** Must equal another field of the same step. Only allowed on a field's root node. */
  | { check: 'equalsField'; field: string }
);

export type SchemaCheckName = SchemaCheck['check'];

interface SchemaNodeBase {
  /**
   * Whether the value may be left out. Object properties use this; a field's root follows the
   * field's `isRequired` instead.
   */
  optional?: boolean;
  /** Whether `null` is allowed. */
  nullable?: boolean;
  /** The message when the value is missing or has the wrong type. */
  message?: string;
  description?: string;
}

export interface ObjectProperty {
  key: string;
  schema: SchemaNode;
}

export type SchemaNode = SchemaNodeBase &
  (
    | { kind: 'string'; checks?: SchemaCheck[] }
    | { kind: 'number'; checks?: SchemaCheck[] }
    | { kind: 'boolean'; checks?: SchemaCheck[] }
    | { kind: 'date'; checks?: SchemaCheck[] }
    | { kind: 'literal'; value: string | number | boolean; checks?: SchemaCheck[] }
    | { kind: 'enum'; values: (string | number)[]; checks?: SchemaCheck[] }
    | { kind: 'object'; properties: ObjectProperty[]; checks?: SchemaCheck[] }
    | { kind: 'array'; item: SchemaNode; checks?: SchemaCheck[] }
    | { kind: 'record'; value: SchemaNode; checks?: SchemaCheck[] }
    | { kind: 'union'; options: SchemaNode[]; checks?: SchemaCheck[] }
    | { kind: 'unknown'; checks?: SchemaCheck[] }
  );

export type SchemaNodeOf<TKind extends SchemaKind> = Extract<SchemaNode, { kind: TKind }>;

/** The checks each kind accepts. `equalsField` is further limited to a field's root node. */
export const CHECKS_BY_KIND: Readonly<Record<SchemaKind, readonly SchemaCheckName[]>> = {
  string: ['minLength', 'maxLength', 'length', 'email', 'url', 'uuid', 'pattern', 'equalsField'],
  number: ['min', 'max', 'integer', 'equalsField'],
  boolean: ['equalsField'],
  date: ['min', 'max', 'equalsField'],
  literal: [],
  enum: ['equalsField'],
  object: [],
  array: ['minLength', 'maxLength', 'length'],
  record: [],
  union: [],
  unknown: [],
};

export const SCHEMA_KINDS: readonly { kind: SchemaKind; label: string }[] = [
  { kind: 'string', label: 'Text' },
  { kind: 'number', label: 'Number' },
  { kind: 'boolean', label: 'Yes / no' },
  { kind: 'date', label: 'Date' },
  { kind: 'literal', label: 'Exact value' },
  { kind: 'enum', label: 'One of' },
  { kind: 'object', label: 'Object' },
  { kind: 'array', label: 'List' },
  { kind: 'record', label: 'Dictionary' },
  { kind: 'union', label: 'Any of' },
  { kind: 'unknown', label: 'Anything' },
];

// ---------------------------------------------------------------------------------------------
// Creating nodes
// ---------------------------------------------------------------------------------------------

/** A new node of `kind`. Keeps `optional`, `nullable`, `message` and `description` from `previous`. */
export function createSchemaNode(kind: SchemaKind, previous?: SchemaNode): SchemaNode {
  const base: SchemaNodeBase = {};

  if (previous?.optional) base.optional = true;
  if (previous?.nullable) base.nullable = true;
  if (previous?.message) base.message = previous.message;
  if (previous?.description) base.description = previous.description;

  // Keep checks that still make sense for the new kind.
  const checks = (previous?.checks ?? []).filter((check) =>
    CHECKS_BY_KIND[kind].includes(check.check),
  );
  const withChecks = checks.length > 0 ? { checks } : {};

  switch (kind) {
    case 'literal':
      return { ...base, kind, value: '' };
    case 'enum':
      return { ...base, kind, values: ['option1', 'option2'], ...withChecks };
    case 'object':
      return { ...base, kind, properties: [] };
    case 'array':
      return {
        ...base,
        kind,
        item: previous && previous.kind !== 'array' ? stripModifiers(previous) : { kind: 'string' },
        ...withChecks,
      };
    case 'record':
      return { ...base, kind, value: { kind: 'string' } };
    case 'union':
      return {
        ...base,
        kind,
        options: [previous ? stripModifiers(previous) : { kind: 'string' }, { kind: 'number' }],
      };
    default:
      return { ...base, kind, ...withChecks } as SchemaNode;
  }
}

function stripModifiers(node: SchemaNode): SchemaNode {
  const { optional: _optional, nullable: _nullable, ...rest } = node;

  return rest as SchemaNode;
}

// ---------------------------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------------------------

/**
 * One step from a node to a child: an object property key, `'#item'` (array item), `'#value'`
 * (record value) or `'#0'`, `'#1'`… (union option). Property keys never start with `#`.
 */
export type SchemaPathSegment = string;
export type SchemaPath = readonly SchemaPathSegment[];

export const ITEM_SEGMENT = '#item';
export const VALUE_SEGMENT = '#value';
export const optionSegment = (index: number) => `#${index}`;

function childOf(node: SchemaNode, segment: SchemaPathSegment): SchemaNode | undefined {
  if (node.kind === 'array' && segment === ITEM_SEGMENT) return node.item;
  if (node.kind === 'record' && segment === VALUE_SEGMENT) return node.value;
  if (node.kind === 'union' && /^#\d+$/.test(segment)) return node.options[Number(segment.slice(1))];
  if (node.kind === 'object') return node.properties.find((property) => property.key === segment)?.schema;

  return undefined;
}

/** The node at `path`, or `undefined` if the path doesn't exist. */
export function getSchemaAt(root: SchemaNode, path: SchemaPath): SchemaNode | undefined {
  let node: SchemaNode | undefined = root;

  for (const segment of path) {
    if (!node) return undefined;
    node = childOf(node, segment);
  }

  return node;
}

/** Returns a new tree with the node at `path` replaced by `update(node)`. */
export function updateSchemaAt(
  root: SchemaNode,
  path: SchemaPath,
  update: (node: SchemaNode) => SchemaNode,
): SchemaNode {
  if (path.length === 0) return update(root);

  const [segment, ...rest] = path as [string, ...string[]];
  const child = childOf(root, segment);

  if (!child) return root;

  const next = updateSchemaAt(child, rest, update);

  if (root.kind === 'array') return { ...root, item: next };
  if (root.kind === 'record') return { ...root, value: next };
  if (root.kind === 'union') {
    const index = Number(segment.slice(1));
    return { ...root, options: root.options.map((option, i) => (i === index ? next : option)) };
  }
  if (root.kind === 'object') {
    return {
      ...root,
      properties: root.properties.map((property) =>
        property.key === segment ? { ...property, schema: next } : property,
      ),
    };
  }

  return root;
}

/** Calls `visit` for every node in the tree, depth first. */
export function walkSchema(
  node: SchemaNode,
  visit: (node: SchemaNode, path: SchemaPath) => void,
  path: SchemaPath = [],
) {
  visit(node, path);

  switch (node.kind) {
    case 'object':
      node.properties.forEach((property) => walkSchema(property.schema, visit, [...path, property.key]));
      break;
    case 'array':
      walkSchema(node.item, visit, [...path, ITEM_SEGMENT]);
      break;
    case 'record':
      walkSchema(node.value, visit, [...path, VALUE_SEGMENT]);
      break;
    case 'union':
      node.options.forEach((option, index) => walkSchema(option, visit, [...path, optionSegment(index)]));
      break;
  }
}

// ---------------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The value a new node starts with. Dates are ISO strings, as everywhere in a definition. */
export function getEmptyValue(node: SchemaNode): JsonValue {
  switch (node.kind) {
    case 'string':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'date':
      return new Date().toISOString();
    case 'literal':
      return node.value;
    case 'enum':
      return node.values[0] ?? '';
    case 'object':
      return Object.fromEntries(
        node.properties.map((property) => [property.key, getEmptyValue(property.schema)]),
      );
    case 'array':
      return [];
    case 'record':
      return {};
    case 'union':
      return node.options[0] ? getEmptyValue(node.options[0]) : null;
    case 'unknown':
      return null;
  }
}

/**
 * Whether a (JSON) value has the shape a node describes. Checks such as `minLength` are not
 * considered: this is about types, not validation.
 */
export function matchesSchema(node: SchemaNode, value: unknown): boolean {
  if (value === null && node.nullable) return true;

  switch (node.kind) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'date':
      return (
        value instanceof Date ||
        (typeof value === 'string' && !Number.isNaN(new Date(value).getTime()))
      );
    case 'literal':
      return value === node.value;
    case 'enum':
      return node.values.includes(value as string | number);
    case 'object':
      return (
        isPlainObject(value) &&
        node.properties.every((property) =>
          value[property.key] === undefined
            ? Boolean(property.schema.optional)
            : matchesSchema(property.schema, value[property.key]),
        )
      );
    case 'array':
      return Array.isArray(value) && value.every((item) => matchesSchema(node.item, item));
    case 'record':
      return isPlainObject(value) && Object.values(value).every((item) => matchesSchema(node.value, item));
    case 'union':
      return node.options.some((option) => matchesSchema(option, value));
    case 'unknown':
      return true;
  }
}

/**
 * Fits an existing value to a (changed) schema, keeping whatever still fits: object properties
 * that still exist, array items that still match, and so on.
 */
export function coerceValue(node: SchemaNode, value: unknown): JsonValue {
  if (value === null && node.nullable) return null;

  switch (node.kind) {
    case 'object': {
      const source = isPlainObject(value) ? value : {};

      return Object.fromEntries(
        node.properties.flatMap((property) => {
          const current = source[property.key];

          if (current === undefined && property.schema.optional) return [];

          return [[property.key, coerceValue(property.schema, current)]];
        }),
      );
    }
    case 'array':
      return Array.isArray(value) ? value.map((item) => coerceValue(node.item, item)) : [];
    case 'record':
      return isPlainObject(value)
        ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, coerceValue(node.value, item)]))
        : {};
    case 'union':
      return matchesSchema(node, value) ? (value as JsonValue) : getEmptyValue(node);
    case 'date':
      if (value instanceof Date) return value.toISOString();
      return matchesSchema(node, value) ? (value as JsonValue) : getEmptyValue(node);
    default:
      return matchesSchema(node, value) ? (value as JsonValue) : getEmptyValue(node);
  }
}

/** Converts a definition (JSON) value into a runtime value: ISO strings at date nodes become `Date`s. */
export function toRuntimeValue(node: SchemaNode, value: JsonValue | undefined): unknown {
  if (value === null || value === undefined) return value;

  switch (node.kind) {
    case 'date':
      return typeof value === 'string' ? new Date(value) : value;
    case 'object':
      if (!isPlainObject(value)) return value;
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => {
          const property = node.properties.find((candidate) => candidate.key === key);

          return [key, property ? toRuntimeValue(property.schema, item) : item];
        }),
      );
    case 'array':
      return Array.isArray(value) ? value.map((item) => toRuntimeValue(node.item, item)) : value;
    case 'record':
      return isPlainObject(value)
        ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toRuntimeValue(node.value, item)]))
        : value;
    case 'union': {
      const option = node.options.find((candidate) => matchesSchema(candidate, value));
      return option ? toRuntimeValue(option, value) : value;
    }
    default:
      return value;
  }
}

/** Converts a runtime value back into a definition (JSON) value. */
export function toJsonValue(value: unknown): JsonValue {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, toJsonValue(item)]),
    );
  }
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol') return null;

  return value as JsonValue;
}

/** Infers a schema from an existing value, e.g. a hand-written field's `defaultValue`. */
export function inferSchema(value: unknown): SchemaNode {
  if (value instanceof Date) return { kind: 'date' };
  if (typeof value === 'string') return { kind: 'string' };
  if (typeof value === 'number') return { kind: 'number' };
  if (typeof value === 'boolean') return { kind: 'boolean' };
  if (value === null || value === undefined) return { kind: 'unknown' };
  if (Array.isArray(value)) {
    return { kind: 'array', item: value.length > 0 ? inferSchema(value[0]) : { kind: 'unknown' } };
  }
  if (isPlainObject(value)) {
    return {
      kind: 'object',
      properties: Object.entries(value).map(([key, item]) => ({ key, schema: inferSchema(item) })),
    };
  }

  return { kind: 'unknown' };
}

// ---------------------------------------------------------------------------------------------
// TypeScript
// ---------------------------------------------------------------------------------------------

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

/** A property key as it appears in source code. */
export function formatPropertyKey(key: string) {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function indentLines(text: string, spaces: number) {
  const pad = ' '.repeat(spaces);

  return text
    .split('\n')
    .map((line, index) => (index === 0 ? line : pad + line))
    .join('\n');
}

/** The TypeScript type a node describes, e.g. `{ min: number; faces: Array<{ id: string }> }`. */
export function toTypeScript(node: SchemaNode): string {
  const type = baseTypeScript(node);

  return node.nullable ? `${wrapUnionMember(type)} | null` : type;
}

function wrapUnionMember(type: string) {
  return type.includes(' | ') && !type.startsWith('{') ? `(${type})` : type;
}

function baseTypeScript(node: SchemaNode): string {
  switch (node.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'unknown':
      return node.kind;
    case 'date':
      return 'Date';
    case 'literal':
      return JSON.stringify(node.value);
    case 'enum':
      return node.values.length > 0 ? node.values.map((value) => JSON.stringify(value)).join(' | ') : 'never';
    case 'object':
      if (node.properties.length === 0) return 'Record<string, never>';
      return `{\n${node.properties
        .map(
          (property) =>
            `  ${formatPropertyKey(property.key)}${property.schema.optional ? '?' : ''}: ${indentLines(toTypeScript(property.schema), 2)};`,
        )
        .join('\n')}\n}`;
    case 'array':
      return `Array<${toTypeScript(node.item)}>`;
    case 'record':
      return `Record<string, ${toTypeScript(node.value)}>`;
    case 'union':
      return node.options.length > 0 ? node.options.map((option) => wrapUnionMember(toTypeScript(option))).join(' | ') : 'never';
  }
}

/** Whether a node's type is wider or narrower than what TypeScript infers from a plain value. */
export function needsTypeAnnotation(node: SchemaNode): boolean {
  if (node.nullable) return true;

  switch (node.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'date':
      return false;
    case 'object':
      return node.properties.some((property) => property.schema.optional || needsTypeAnnotation(property.schema));
    default:
      return true;
  }
}

/**
 * Source code for a value, e.g. `{ min: 1, date: new Date("2025-01-01T00:00:00.000Z") }`.
 * Date nodes are written as `new Date(...)`.
 */
export function toValueSource(node: SchemaNode | undefined, value: JsonValue | undefined): string {
  if (value === undefined) return 'undefined';

  // Match `toRuntimeValue`: resolve the branch so nested dates become `new Date(...)`.
  if (node?.kind === 'union') {
    const option = node.options.find((candidate) => matchesSchema(candidate, value));

    return toValueSource(option, value);
  }

  if (node?.kind === 'date' && typeof value === 'string') return `new Date(${JSON.stringify(value)})`;

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';

    const item = node?.kind === 'array' ? node.item : undefined;
    const items = value.map((entry) => toValueSource(item, entry));
    const inline = `[${items.join(', ')}]`;

    return inline.length <= 60 && !inline.includes('\n')
      ? inline
      : `[\n${items.map((entry) => `  ${indentLines(entry, 2)},`).join('\n')}\n]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);

    if (entries.length === 0) return '{}';

    const lines = entries.map(([key, entry]) => {
      const child =
        node?.kind === 'object'
          ? node.properties.find((property) => property.key === key)?.schema
          : node?.kind === 'record'
            ? node.value
            : undefined;

      return `${formatPropertyKey(key)}: ${indentLines(toValueSource(child, entry), 2)}`;
    });
    const inline = `{ ${lines.join(', ')} }`;

    return inline.length <= 60 && !inline.includes('\n')
      ? inline
      : `{\n${lines.map((line) => `  ${line},`).join('\n')}\n}`;
  }

  return JSON.stringify(value);
}
