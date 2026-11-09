/**
 * The serializable document a form builder edits.
 *
 * Everything in a {@linkcode FormDefinition} is JSON-safe: no functions, no class instances,
 * and no `Date` objects (dates are stored as ISO strings). That makes it possible to store
 * definitions in a database, send them over the network, diff them, and load them back into a
 * builder or compile them into a runnable multi-step form.
 */
import {
  changeCasing,
  createFieldLabel,
  DEFAULT_CASING,
  type CasingType,
} from '@jfdevelops/multi-step-form-core';
import type { SchemaNode } from './schema.js';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** The current {@linkcode FormDefinition.schemaVersion}. */
export const DEFINITION_SCHEMA_VERSION = 1 as const;

/** The name of a registered validator adapter, e.g. `'builtin'` or `'zod'`. */
export type ValidatorLibrary = 'builtin' | (string & {});

/** Form-wide options. They map to `defineMultiStepForm` and `configure` options. */
export interface FormSettings {
  /** How field keys are turned into labels, unless a step or field says otherwise. @default 'title' */
  nameTransformCasing?: CasingType;
  /** The validator library steps use unless they pick their own. No validation when omitted. */
  validator?: ValidatorLibrary;
  /** Persists form progress under this storage key. */
  storageKey?: string;
  /** Named, independent instances of the form, e.g. `['client', 'admin']`. */
  instances?: string[];
}

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
  settings?: FormSettings;
  /** The steps in display order. */
  steps: StepDefinition[];
}

export type StepValidation =
  /**
   * A Standard Schema validator compiled from the fields' schemas. `library` overrides the form's
   * `settings.validator`.
   */
  | { kind: 'schema'; library?: ValidatorLibrary }
  /** No validation, even if the form has a default library. The step is always complete. */
  | { kind: 'none' }
  /**
   * A validator written in application code. The builder shows it but cannot edit it.
   * `ref` is a human-readable label such as `step1.validateFields`.
   */
  | { kind: 'code'; ref: string };

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
  /** How field keys in this step are turned into labels. Inherits the form's setting. */
  nameTransformCasing?: CasingType;
  /** The fields in display order. */
  fields: FieldDefinition[];
  /**
   * How the step is validated. When omitted, the step uses the form's `settings.validator`, or
   * no validation. Completeness follows validation: a step without validation is always complete.
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
  /** The field's data key inside its step, e.g. `email`. Labels are derived from it. */
  key: string;
  /**
   * How the field is rendered, e.g. `'string'`, `'string.email'` or `'boolean.switch'`. Uses the
   * same vocabulary as the `type` metadata of hand-written multi-step form fields.
   */
  type: string;
  /** The shape of the field's value, and the rules its step's validator checks. */
  schema: SchemaNode;
  /** The initial value. Dates are ISO strings. */
  defaultValue: JsonValue;
  /** The label. `false` renders no label; omitted derives one from the key. */
  label?: string | false;
  /** How the key is turned into a label. Inherits the step's setting. */
  nameTransformCasing?: CasingType;
  description?: string;
  placeholder?: string;
  /** Whether the field must be filled in. Required labels get a trailing `*`. */
  isRequired?: boolean;
  /** The field-level error message copy. */
  errorMessage?: string;
  /** Type-specific settings such as `options` for choice fields. */
  props?: JsonObject;
}

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

/** The casing a field's label uses: the field's, else its step's, else the form's, else `title`. */
export function resolveFieldCasing(
  field: Pick<FieldDefinition, 'nameTransformCasing'>,
  step?: Pick<StepDefinition, 'nameTransformCasing'>,
  settings?: FormSettings,
): CasingType {
  return (
    field.nameTransformCasing ??
    step?.nameTransformCasing ??
    settings?.nameTransformCasing ??
    DEFAULT_CASING
  );
}

/**
 * The label a field shows, resolved exactly as a multi-step form resolves it: the explicit label,
 * else the key in the resolved casing with a trailing `*` when required. `undefined` for
 * `label: false`.
 */
export function resolveFieldLabel(
  field: Pick<FieldDefinition, 'key' | 'label' | 'nameTransformCasing' | 'isRequired'>,
  step?: Pick<StepDefinition, 'nameTransformCasing'>,
  settings?: FormSettings,
): string | undefined {
  return createFieldLabel(
    field.label,
    field.key,
    resolveFieldCasing(field, step, settings),
    Boolean(field.isRequired),
  );
}

/**
 * The validator library a step compiles with, or `undefined` when it has no builder-managed
 * validation (none, or code-owned).
 */
export function resolveStepLibrary(
  step: Pick<StepDefinition, 'validation'>,
  settings?: FormSettings,
): ValidatorLibrary | undefined {
  const validation = step.validation;

  if (validation?.kind === 'none' || validation?.kind === 'code') return undefined;
  if (validation?.kind === 'schema') return validation.library ?? settings?.validator ?? 'builtin';

  return settings?.validator;
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
  options: { id?: string; title?: string; stepTitle?: string; settings?: FormSettings } = {},
): FormDefinition {
  return {
    schemaVersion: DEFINITION_SCHEMA_VERSION,
    id: options.id ?? createId('form'),
    revision: 0,
    ...(options.title ? { meta: { title: options.title } } : {}),
    ...(options.settings ? { settings: options.settings } : {}),
    steps: [
      {
        id: createId('step'),
        title: options.stepTitle ?? 'Step 1',
        fields: [],
      },
    ],
  };
}
