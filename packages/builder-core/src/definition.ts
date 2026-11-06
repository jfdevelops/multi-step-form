/**
 * The serializable document a form builder edits.
 *
 * Everything in a {@linkcode FormDefinition} is JSON-safe: no functions, no class instances,
 * and no `Date` objects (dates are stored as ISO strings). That makes it possible to store
 * definitions in a database, send them over the network, diff them, and load them back into a
 * builder or compile them into a runnable multi-step form.
 */
import { changeCasing } from '@jfdevelops/multi-step-form-core';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** The current {@linkcode FormDefinition.schemaVersion}. */
export const DEFINITION_SCHEMA_VERSION = 1 as const;

/**
 * The runtime shape of a field's value. It is derived from the field type: `'string.email'`
 * has a value type of `'string'`, `'boolean.switch'` has `'boolean'`, and so on.
 */
export type FieldValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'unknown';

export interface FormDefinition {
  schemaVersion: typeof DEFINITION_SCHEMA_VERSION;
  /** A stable identifier for the form. */
  id: string;
  /** Incremented by storage adapters when a definition is saved. */
  revision: number;
  meta?: {
    title?: string;
    description?: string;
  };
  /** The steps in display order. */
  steps: StepDefinition[];
}

export interface StepDefinition {
  /**
   * A stable identifier used by the builder. Never shown to end users.
   *
   * Steps have no stored key: a multi-step form names steps by position (`step1`, `step2`, …,
   * see {@linkcode getStepKey}), so a step's key changes when it is reordered.
   */
  id: string;
  title: string;
  description?: string;
  /** The fields in display order. */
  fields: FieldDefinition[];
  /**
   * How the step is validated. Completeness follows validation: a step without validation is
   * always complete.
   */
  validation?: StepValidation;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDefinition {
  /** A stable identifier used by the builder. Never shown to end users. */
  id: string;
  /** The field's data key inside its step, e.g. `email`. */
  key: string;
  /**
   * The registered field type, e.g. `'string'`, `'string.email'` or `'boolean.switch'`. Uses
   * the same vocabulary as the `type` metadata of hand-written multi-step form fields.
   */
  type: string;
  /** The label. `false` renders no label; omitted derives one from the key. */
  label?: string | false;
  description?: string;
  placeholder?: string;
  isRequired?: boolean;
  /** The field-level error message copy. */
  errorMessage?: string;
  /** The initial value. Date fields store an ISO string. */
  defaultValue: JsonValue;
  /** Type-specific settings such as `options` for choice fields. */
  props?: JsonObject;
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

/** The name of a registered validator adapter, e.g. `'builtin'` or `'zod'`. */
export type ValidatorLibrary = 'builtin' | 'zod' | (string & {});

export type StepValidation =
  /** Complete when every required field has a value. Uses the built-in validator. */
  | { kind: 'required' }
  /** A Standard Schema validator compiled from per-field rules by the chosen library. */
  | {
      kind: 'schema';
      library: ValidatorLibrary;
      /** Rules keyed by field key. Fields without an entry use their inferred rules. */
      fields: Record<string, FieldSchemaSpec>;
    }
  /**
   * A validator written in application code. The builder shows it but cannot edit it.
   * `ref` is a human-readable label such as `contact.validateFields`.
   */
  | { kind: 'code'; ref: string };

export interface FieldSchemaSpec {
  type: FieldValueType;
  /**
   * Whether an empty value is allowed. When omitted, it follows the field's `isRequired`
   * setting.
   */
  optional?: boolean;
  /** The message used when the value is missing or has the wrong type. */
  message?: string;
  checks?: FieldCheck[];
}

export type FieldCheck = { message?: string } & (
  | { check: 'minLength' | 'maxLength' | 'length'; value: number }
  | { check: 'min' | 'max'; value: number | string }
  | { check: 'email' | 'url' | 'uuid' | 'integer' }
  | { check: 'pattern'; value: string; flags?: string }
  | { check: 'oneOf'; values: JsonValue[] }
  | { check: 'equalsField'; field: string }
);

export type FieldCheckName = FieldCheck['check'];

/** The checks that make sense for each value type. */
export const CHECKS_BY_VALUE_TYPE: Readonly<
  Record<FieldValueType, readonly FieldCheckName[]>
> = {
  string: [
    'minLength',
    'maxLength',
    'length',
    'email',
    'url',
    'uuid',
    'pattern',
    'oneOf',
    'equalsField',
  ],
  number: ['min', 'max', 'integer', 'oneOf', 'equalsField'],
  boolean: ['oneOf', 'equalsField'],
  date: ['min', 'max', 'equalsField'],
  array: ['minLength', 'maxLength', 'length', 'oneOf'],
  object: [],
  unknown: ['oneOf', 'equalsField'],
};

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const KEY_PATTERN = /^[A-Za-z_$][\w$]*$/;

/**
 * The key a step compiles to: its 1-based position, e.g. index `0` → `step1`. Multi-step forms
 * treat the number as the step's position (progress, navigation), so it is never stored.
 */
export function getStepKey(index: number) {
  return `step${index + 1}` as const;
}

/** Whether `key` can be used as a field key (a valid JavaScript identifier). */
export function isValidKey(key: string) {
  return KEY_PATTERN.test(key);
}

/**
 * Converts arbitrary text into a camelCase field key, e.g. `"First name"` → `"firstName"`,
 * using the same casing rules multi-step forms use for labels.
 */
export function toKey(text: string, fallback = 'field') {
  // Characters that can't appear in an identifier become word breaks.
  const words = text.normalize('NFKD').replace(/[^\w\s$-]/g, ' ').trim();
  const key = words ? changeCasing(words, 'camel') : '';
  const safe = /^\d/.test(key) ? `_${key}` : key;

  return safe && isValidKey(safe) ? safe : fallback;
}

/** Returns `base`, or `base2`, `base3`… so it doesn't collide with `taken`. */
export function uniqueKey(base: string, taken: Iterable<string>) {
  const used = new Set(taken);

  if (!used.has(base)) {
    return base;
  }

  let index = 2;

  while (used.has(`${base}${index}`)) {
    index++;
  }

  return `${base}${index}`;
}

/** The value type for a field type: the segment before the first `.`. */
export function getValueTypeFromFieldType(type: string): FieldValueType {
  const base = type.split('.')[0];

  switch (base) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'date':
    case 'array':
    case 'object':
      return base;
    default:
      return 'unknown';
  }
}

let idCounter = 0;

/** The default id generator: short, unique within a session, and prefixed for readability. */
export function createId(prefix: string) {
  idCounter = (idCounter + 1) % Number.MAX_SAFE_INTEGER;
  const random = Math.random().toString(36).slice(2, 8);

  return `${prefix}_${random}${idCounter.toString(36)}`;
}

/** Creates an empty definition with a single step. */
export function createEmptyDefinition(
  options: { id?: string; title?: string; stepTitle?: string } = {},
): FormDefinition {
  return {
    schemaVersion: DEFINITION_SCHEMA_VERSION,
    id: options.id ?? createId('form'),
    revision: 0,
    ...(options.title ? { meta: { title: options.title } } : {}),
    steps: [
      {
        id: createId('step'),
        title: options.stepTitle ?? 'Step 1',
        fields: [],
      },
    ],
  };
}
