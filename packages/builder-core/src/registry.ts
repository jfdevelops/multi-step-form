import type {
  FieldDefinition,
  FieldOption,
  JsonObject,
  JsonValue,
} from './definition.js';
import { FormBuilderError } from './errors.js';
import { getEmptyValue, type SchemaCheck, type SchemaNode } from './schema.js';
import { builtinAdapter } from './validators/builtin.js';
import type { ValidatorAdapter } from './validators/types.js';

// ---------------------------------------------------------------------------------------------
// Inspector descriptors
// ---------------------------------------------------------------------------------------------

/**
 * Which kind of input an inspector property needs. Renderers map these to their own components.
 * Custom strings are allowed for controls you render yourself.
 *
 * - `value`: a value editor driven by the field's schema (see `getSchemaAt`, `toTypeScript`).
 * - `casing`: a `nameTransformCasing` picker; `options` holds the casings.
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
  | 'value'
  | 'casing'
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
  value: descriptor('value'),
  casing: descriptor('casing'),
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

/**
 * One way to render a field, picked in the inspector. Its `type` is stored on the field and
 * written to the generated form's `type` metadata, e.g. `'string.email'`.
 */
export interface InputTypeDefinition {
  type: string;
  label: string;
  /** Checks added to the field's schema while this input type is selected, e.g. `email`. */
  checks?: readonly SchemaCheck[];
}

export interface FieldTypeDefinition {
  /** The palette id, e.g. `'text'`. */
  id: string;
  /** The name shown in the palette. */
  label: string;
  /** The palette category. @default 'Basic' */
  category?: string;
  /** An icon name for your palette to render. */
  icon?: string;
  /** Extra search terms for the palette. */
  keywords?: readonly string[];
  /** The ways the field can be rendered. The first is the default. */
  inputTypes: readonly InputTypeDefinition[];
  /** The schema new fields start with. A function is called once per new field. */
  schema: SchemaNode | (() => SchemaNode);
  /** The initial value of new fields. Defaults to the schema's empty value. */
  defaultValue?: JsonValue | (() => JsonValue);
  /** Initial settings for new fields. */
  defaults?: Partial<
    Pick<FieldDefinition, 'label' | 'placeholder' | 'description' | 'isRequired' | 'errorMessage' | 'props'>
  >;
  /** Type-specific inspector sections, shown after the common ones. */
  inspector?: readonly InspectorSection[];
}

export interface ResolvedFieldType extends FieldTypeDefinition {
  category: string;
  keywords: readonly string[];
}

const optionsSection = section('Options', [
  prop.options('props.options', {
    label: 'Options',
    validate: (value) =>
      Array.isArray(value) && value.length > 0 ? undefined : 'Add at least one option',
  }),
]);

const defaultOptions = (): FieldOption[] => [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
];

const optionsProps = () => ({ options: defaultOptions() as unknown as JsonValue });

/** The field types every registry includes unless `builtins: false` is passed. */
export const BUILTIN_FIELD_TYPES: readonly FieldTypeDefinition[] = [
  {
    id: 'text',
    label: 'Text',
    icon: 'type',
    keywords: ['string', 'input', 'email', 'url', 'phone', 'password', 'textarea', 'paragraph'],
    inputTypes: [
      { type: 'string', label: 'Text' },
      { type: 'string.textarea', label: 'Long text' },
      { type: 'string.email', label: 'Email', checks: [{ check: 'email' }] },
      { type: 'string.url', label: 'URL', checks: [{ check: 'url' }] },
      { type: 'string.tel', label: 'Phone' },
      { type: 'string.password', label: 'Password' },
    ],
    schema: { kind: 'string' },
  },
  {
    id: 'number',
    label: 'Number',
    icon: 'hash',
    keywords: ['amount', 'quantity', 'integer'],
    inputTypes: [{ type: 'number', label: 'Number' }],
    schema: { kind: 'number' },
  },
  {
    id: 'boolean',
    label: 'Checkbox',
    icon: 'check-square',
    keywords: ['boolean', 'switch', 'toggle', 'consent', 'agree'],
    inputTypes: [
      { type: 'boolean', label: 'Checkbox' },
      { type: 'boolean.switch', label: 'Switch' },
    ],
    schema: { kind: 'boolean' },
  },
  {
    id: 'date',
    label: 'Date',
    icon: 'calendar',
    keywords: ['time', 'day'],
    inputTypes: [{ type: 'date', label: 'Date' }],
    schema: { kind: 'date' },
  },
  {
    id: 'choice',
    label: 'Choice',
    category: 'Choice',
    icon: 'circle-dot',
    keywords: ['select', 'dropdown', 'radio', 'single choice', 'enum'],
    inputTypes: [
      { type: 'string.select', label: 'Dropdown' },
      { type: 'string.radio', label: 'Radio group' },
    ],
    schema: () => ({ kind: 'enum', values: defaultOptions().map((option) => option.value) }),
    defaultValue: '',
    defaults: { props: optionsProps() },
    inspector: [optionsSection],
  },
  {
    id: 'multiChoice',
    label: 'Multiple choice',
    category: 'Choice',
    icon: 'list-checks',
    keywords: ['checkbox group', 'multi select'],
    inputTypes: [{ type: 'array.checkbox', label: 'Checkbox group' }],
    schema: () => ({
      kind: 'array',
      item: { kind: 'enum', values: defaultOptions().map((option) => option.value) },
    }),
    defaults: { props: optionsProps() },
    inspector: [optionsSection],
  },
  {
    id: 'object',
    label: 'Group',
    category: 'Structured',
    icon: 'braces',
    keywords: ['object', 'nested', 'json'],
    inputTypes: [{ type: 'object', label: 'Group' }],
    schema: { kind: 'object', properties: [] },
  },
  {
    id: 'array',
    label: 'List',
    category: 'Structured',
    icon: 'brackets',
    keywords: ['array', 'repeat', 'json'],
    inputTypes: [{ type: 'array', label: 'List' }],
    schema: { kind: 'array', item: { kind: 'string' } },
  },
];

function resolveFieldType(definition: FieldTypeDefinition): ResolvedFieldType {
  if (definition.inputTypes.length === 0) {
    throw new FormBuilderError({
      operation: 'createRegistry',
      reason: `Field type "${definition.id}" needs at least one input type.`,
      target: definition.id,
    });
  }

  return {
    ...definition,
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
  /** Field types in registration order. Later registrations replace earlier ones with the same id. */
  readonly fieldTypes: readonly ResolvedFieldType[];
  readonly validators: readonly ValidatorAdapter[];
  /** A field type by palette id, or by one of its input types (e.g. `'string.email'`). */
  getFieldType(idOrInputType: string): ResolvedFieldType | undefined;
  /** Like `getFieldType`, but throws a {@linkcode FormBuilderError} when it is unknown. */
  requireFieldType(idOrInputType: string, operation?: string): ResolvedFieldType;
  /** The input type definition for a field's `type`. */
  getInputType(type: string): InputTypeDefinition | undefined;
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
  const byInputType = new Map<string, { fieldType: ResolvedFieldType; input: InputTypeDefinition }>();

  for (const fieldType of fieldTypeList) {
    for (const input of fieldType.inputTypes) {
      // The first registration of an input type wins, so built-ins stay predictable.
      if (!byInputType.has(input.type)) byInputType.set(input.type, { fieldType, input });
    }
  }

  const getFieldType = (idOrInputType: string) =>
    fieldTypes.get(idOrInputType) ?? byInputType.get(idOrInputType)?.fieldType;

  return Object.freeze({
    fieldTypes: fieldTypeList,
    validators: validatorList,
    getFieldType,
    requireFieldType(idOrInputType: string, operation = 'registry.requireFieldType') {
      const fieldType = getFieldType(idOrInputType);

      if (!fieldType) {
        throw new FormBuilderError({
          operation,
          reason: `Unknown field type "${idOrInputType}". Register it with createRegistry({ fieldTypes }) or registry.withFieldType().`,
          target: idOrInputType,
        });
      }

      return fieldType;
    },
    getInputType: (type: string) => byInputType.get(type)?.input,
    getValidator: (library: string) => validators.get(library),
    withFieldType(definition: FieldTypeDefinition) {
      const next = new Map(fieldTypes);
      next.set(definition.id, resolveFieldType(definition));

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
    fieldTypes.set(definition.id, resolveFieldType(definition));
  }

  for (const adapter of options.validators ?? []) {
    validators.set(adapter.library, adapter);
  }

  return buildRegistry(fieldTypes, validators);
}

/** Resolves a field type's starting schema. */
export function resolveSchema(fieldType: FieldTypeDefinition): SchemaNode {
  return typeof fieldType.schema === 'function'
    ? fieldType.schema()
    : structuredCloneJson(fieldType.schema as unknown as JsonValue) as unknown as SchemaNode;
}

/** Resolves a field type's starting value: its `defaultValue`, else the schema's empty value. */
export function resolveDefaultValue(fieldType: FieldTypeDefinition, schema: SchemaNode): JsonValue {
  if (fieldType.defaultValue === undefined) return getEmptyValue(schema);

  return typeof fieldType.defaultValue === 'function'
    ? fieldType.defaultValue()
    : structuredCloneJson(fieldType.defaultValue);
}

/** Deep-copies a JSON value. */
export function structuredCloneJson<T extends JsonValue | undefined>(value: T): T {
  return value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

/** The choice values in `props.options`. */
export function getOptionValues(props: JsonObject | undefined): string[] {
  const options = props?.options;

  return Array.isArray(options)
    ? options.flatMap((option) =>
        option && typeof option === 'object' && !Array.isArray(option) && typeof option.value === 'string'
          ? [option.value]
          : [],
      )
    : [];
}
