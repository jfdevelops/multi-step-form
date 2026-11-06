import {
  getValueTypeFromFieldType,
  type FieldCheck,
  type FieldDefinition,
  type FieldOption,
  type FieldValueType,
  type JsonValue,
} from './definition.js';
import { FormBuilderError } from './errors.js';
import { builtinAdapter } from './validators/builtin.js';
import type { ValidatorAdapter } from './validators/types.js';

// ---------------------------------------------------------------------------------------------
// Inspector descriptors
// ---------------------------------------------------------------------------------------------

/**
 * Which kind of input an inspector property needs. Renderers map these to their own components.
 * Custom strings are allowed for controls you render yourself.
 */
export type ControlKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'switch'
  | 'select'
  | 'date'
  | 'options'
  | 'key'
  | 'json'
  | (string & {});

export interface PropertyDescriptor {
  /** A dot path inside the node, e.g. `label` or `props.rows`. */
  path: string;
  control: ControlKind;
  label: string;
  description?: string;
  placeholder?: string;
  /** Choices for `select` controls. */
  options?: readonly FieldOption[];
  min?: number;
  max?: number;
  /** Shows the property only when this returns `true` for the inspected node. */
  visibleWhen?: (node: FieldDefinition) => boolean;
  /** Returns an error message for an invalid value. */
  validate?: (value: unknown, node: FieldDefinition) => string | undefined;
}

export interface InspectorSection {
  id: string;
  title: string;
  properties: readonly PropertyDescriptor[];
}

type PropertyOptions = Omit<PropertyDescriptor, 'path' | 'control'>;

function descriptor(control: ControlKind) {
  return (path: string, options: PropertyOptions): PropertyDescriptor => ({
    ...options,
    path,
    control,
  });
}

/** Builders for {@linkcode PropertyDescriptor}s. */
export const prop = {
  text: descriptor('text'),
  textarea: descriptor('textarea'),
  number: descriptor('number'),
  switch: descriptor('switch'),
  select: descriptor('select'),
  date: descriptor('date'),
  options: descriptor('options'),
  key: descriptor('key'),
  json: descriptor('json'),
  custom: (control: string, path: string, options: PropertyOptions) =>
    descriptor(control)(path, options),
};

/** Creates an inspector section. The id defaults to the lower-cased title. */
export function section(
  title: string,
  properties: readonly PropertyDescriptor[],
  id = title.toLowerCase().replace(/\s+/g, '-'),
): InspectorSection {
  return { id, title, properties };
}

// ---------------------------------------------------------------------------------------------
// Field types
// ---------------------------------------------------------------------------------------------

export interface FieldTypeDefinition {
  /** The field type, e.g. `'string.email'`. The segment before `.` sets the value type. */
  type: string;
  /** The name shown in the palette. */
  label: string;
  /** The palette category. @default 'Basic' */
  category?: string;
  /** An icon name for your palette to render. */
  icon?: string;
  /** Extra search terms for the palette. */
  keywords?: readonly string[];
  /** Overrides the value type derived from `type`. */
  valueType?: FieldValueType;
  /** The initial value of new fields. A function is called once per new field. */
  defaultValue: JsonValue | (() => JsonValue);
  /** Initial settings for new fields. */
  defaults?: Partial<
    Pick<
      FieldDefinition,
      'label' | 'placeholder' | 'description' | 'isRequired' | 'errorMessage' | 'props'
    >
  >;
  /** Type-specific inspector sections, shown after the common ones. */
  inspector?: readonly InspectorSection[];
  /** The validation checks a field of this type starts with when its step gets a validator. */
  inferChecks?: (field: FieldDefinition) => FieldCheck[];
}

export interface ResolvedFieldType extends FieldTypeDefinition {
  valueType: FieldValueType;
  category: string;
  keywords: readonly string[];
}

function getOptions(field: FieldDefinition) {
  const options = field.props?.options;

  return Array.isArray(options)
    ? options.flatMap((option) =>
        option && typeof option === 'object' && !Array.isArray(option)
          ? [option.value as JsonValue]
          : [],
      )
    : [];
}

const optionsSection = section('Options', [
  prop.options('props.options', {
    label: 'Options',
    validate: (value) =>
      Array.isArray(value) && value.length > 0
        ? undefined
        : 'Add at least one option',
  }),
]);

const choiceChecks = (field: FieldDefinition): FieldCheck[] => {
  const values = getOptions(field);

  return values.length > 0 ? [{ check: 'oneOf', values }] : [];
};

const defaultOptions = (): FieldOption[] => [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

/** The field types every registry includes unless `builtins: false` is passed. */
export const BUILTIN_FIELD_TYPES: readonly FieldTypeDefinition[] = [
  { type: 'string', label: 'Short text', icon: 'type', keywords: ['text', 'input'], defaultValue: '' },
  {
    type: 'string.textarea',
    label: 'Long text',
    icon: 'align-left',
    keywords: ['paragraph', 'multiline'],
    defaultValue: '',
  },
  {
    type: 'string.email',
    label: 'Email',
    icon: 'mail',
    defaultValue: '',
    defaults: { label: 'Email' },
    inferChecks: () => [{ check: 'email' }],
  },
  {
    type: 'string.url',
    label: 'URL',
    icon: 'link',
    keywords: ['website', 'link'],
    defaultValue: '',
    inferChecks: () => [{ check: 'url' }],
  },
  { type: 'string.tel', label: 'Phone', icon: 'phone', keywords: ['telephone'], defaultValue: '' },
  { type: 'string.password', label: 'Password', icon: 'lock', defaultValue: '' },
  { type: 'number', label: 'Number', icon: 'hash', keywords: ['amount', 'quantity'], defaultValue: 0 },
  { type: 'boolean', label: 'Checkbox', icon: 'check-square', keywords: ['consent', 'agree'], defaultValue: false },
  { type: 'boolean.switch', label: 'Switch', icon: 'toggle-left', keywords: ['toggle'], defaultValue: false },
  {
    type: 'date',
    label: 'Date',
    icon: 'calendar',
    defaultValue: () => new Date().toISOString(),
  },
  {
    type: 'string.select',
    label: 'Dropdown',
    category: 'Choice',
    icon: 'chevron-down',
    keywords: ['select'],
    defaultValue: '',
    defaults: { props: { options: defaultOptions() as unknown as JsonValue } },
    inspector: [optionsSection],
    inferChecks: choiceChecks,
  },
  {
    type: 'string.radio',
    label: 'Radio group',
    category: 'Choice',
    icon: 'circle-dot',
    keywords: ['single choice'],
    defaultValue: '',
    defaults: { props: { options: defaultOptions() as unknown as JsonValue } },
    inspector: [optionsSection],
    inferChecks: choiceChecks,
  },
  {
    type: 'array.checkbox',
    label: 'Checkbox group',
    category: 'Choice',
    icon: 'list-checks',
    keywords: ['multiple choice'],
    defaultValue: [],
    defaults: { props: { options: defaultOptions() as unknown as JsonValue } },
    inspector: [optionsSection],
    inferChecks: choiceChecks,
  },
  // Generic structured values, so hand-written forms with object/array defaults can be imported.
  { type: 'object', label: 'Object (JSON)', category: 'Advanced', icon: 'braces', defaultValue: {} },
  { type: 'array', label: 'List (JSON)', category: 'Advanced', icon: 'brackets', defaultValue: [] },
];

function resolveFieldType(definition: FieldTypeDefinition): ResolvedFieldType {
  return {
    ...definition,
    valueType: definition.valueType ?? getValueTypeFromFieldType(definition.type),
    category: definition.category ?? 'Basic',
    keywords: definition.keywords ?? [],
  };
}

// ---------------------------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------------------------

export interface CreateRegistryOptions {
  fieldTypes?: readonly FieldTypeDefinition[];
  /** Validator adapters to offer. The built-in adapter is always included. */
  validators?: readonly ValidatorAdapter[];
  /** Whether to include {@linkcode BUILTIN_FIELD_TYPES}. @default true */
  builtins?: boolean;
}

/**
 * The field types and validator libraries a builder knows about. Registries are immutable:
 * `withFieldType` and `withValidator` return a new registry.
 */
export interface FormRegistry {
  /** Field types in registration order. Later registrations replace earlier ones of the same type. */
  readonly fieldTypes: readonly ResolvedFieldType[];
  readonly validators: readonly ValidatorAdapter[];
  getFieldType(type: string): ResolvedFieldType | undefined;
  /** Like `getFieldType`, but throws a {@linkcode FormBuilderError} for unknown types. */
  requireFieldType(type: string, operation?: string): ResolvedFieldType;
  getValidator(library: string): ValidatorAdapter | undefined;
  withFieldType(definition: FieldTypeDefinition): FormRegistry;
  withValidator(adapter: ValidatorAdapter): FormRegistry;
}

function buildRegistry(
  fieldTypes: Map<string, ResolvedFieldType>,
  validators: Map<string, ValidatorAdapter>,
): FormRegistry {
  const fieldTypeList = Object.freeze([...fieldTypes.values()]);
  const validatorList = Object.freeze([...validators.values()]);

  return Object.freeze({
    fieldTypes: fieldTypeList,
    validators: validatorList,
    getFieldType: (type: string) => fieldTypes.get(type),
    requireFieldType(type: string, operation = 'registry.requireFieldType') {
      const fieldType = fieldTypes.get(type);

      if (!fieldType) {
        throw new FormBuilderError({
          operation,
          reason: `Unknown field type "${type}". Register it with createRegistry({ fieldTypes }) or registry.withFieldType().`,
          target: type,
        });
      }

      return fieldType;
    },
    getValidator: (library: string) => validators.get(library),
    withFieldType(definition: FieldTypeDefinition) {
      const next = new Map(fieldTypes);
      next.set(definition.type, resolveFieldType(definition));

      return buildRegistry(next, validators);
    },
    withValidator(adapter: ValidatorAdapter) {
      const next = new Map(validators);
      next.set(adapter.library, adapter);

      return buildRegistry(fieldTypes, next);
    },
  });
}

export function createRegistry(options: CreateRegistryOptions = {}): FormRegistry {
  const fieldTypes = new Map<string, ResolvedFieldType>();
  const validators = new Map<string, ValidatorAdapter>([
    [builtinAdapter.library, builtinAdapter],
  ]);

  for (const definition of [
    ...(options.builtins === false ? [] : BUILTIN_FIELD_TYPES),
    ...(options.fieldTypes ?? []),
  ]) {
    fieldTypes.set(definition.type, resolveFieldType(definition));
  }

  for (const adapter of options.validators ?? []) {
    validators.set(adapter.library, adapter);
  }

  return buildRegistry(fieldTypes, validators);
}

/** Resolves a field type's default value, calling it when it is a function. */
export function resolveDefaultValue(fieldType: FieldTypeDefinition): JsonValue {
  return typeof fieldType.defaultValue === 'function'
    ? fieldType.defaultValue()
    : structuredCloneJson(fieldType.defaultValue);
}

/** Deep-copies a JSON value. */
export function structuredCloneJson<T extends JsonValue | undefined>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}
