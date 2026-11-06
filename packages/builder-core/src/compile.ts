import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  changeCasing,
  defineMultiStepForm,
  isCasingValid,
  type CasingType,
} from '@jfdevelops/multi-step-form-core';
import {
  createId,
  DEFINITION_SCHEMA_VERSION,
  getStepKey,
  type FieldDefinition,
  type FormDefinition,
  type FormSettings,
  type JsonObject,
  type StepDefinition,
} from './definition.js';
import { FormBuilderError } from './errors.js';
import { createRegistry, type FormRegistry } from './registry.js';
import {
  formatPropertyKey,
  inferSchema,
  matchesSchema,
  needsTypeAnnotation,
  toJsonValue,
  toRuntimeValue,
  toTypeScript,
  toValueSource,
  type SchemaNode,
} from './schema.js';
import { buildStepValidator, compileStepValidator } from './validation.js';
import type { StepValues } from './validators/types.js';

/** A field in the shape `defineMultiStepForm` accepts. */
export interface CompiledField {
  defaultValue: unknown;
  type?: string;
  label?: string | false;
  nameTransformCasing?: CasingType;
  placeholder?: string;
  isRequired?: boolean;
  errorMessage?: string;
  description?: string;
  props?: JsonObject;
}

/** A step in the shape `defineMultiStepForm` accepts. */
export interface CompiledStep {
  title: string;
  description?: string;
  nameTransformCasing?: CasingType;
  fields: Record<string, CompiledField>;
  validateFields?: StandardSchemaV1<StepValues, StepValues>;
  isComplete?: (values: StepValues) => boolean;
}

/** The options `defineMultiStepForm` accepts. */
export interface CompiledDefinition {
  steps: Record<string, CompiledStep>;
  instances?: string[];
}

/** The options `configure` accepts. */
export interface CompiledConfigureOptions {
  nameTransformCasing?: CasingType;
  storage?: { key: string };
}

/** Code-owned step logic that a definition can only reference (`validation.kind: 'code'`). */
export interface CodeStepLogic {
  validateFields?: StandardSchemaV1<StepValues, StepValues>;
  isComplete?: (values: StepValues) => boolean;
}

export interface CompileDefinitionOptions {
  registry?: FormRegistry;
  /**
   * Supplies the validator or `isComplete` for steps whose validation lives in application code.
   * Without it, those steps compile with no validation.
   */
  resolveCode?: (
    step: StepDefinition,
    context: { key: `step${number}`; index: number },
  ) => CodeStepLogic | undefined;
}

/** A date field's `type` must be `'date'` in a multi-step form. */
function fieldType(field: FieldDefinition) {
  return field.schema.kind === 'date' ? 'date' : field.type;
}

function compileField(field: FieldDefinition): CompiledField {
  const compiled: CompiledField = {
    defaultValue: toRuntimeValue(field.schema, field.defaultValue),
    type: fieldType(field),
  };

  if (field.label !== undefined) compiled.label = field.label;
  if (field.nameTransformCasing !== undefined) compiled.nameTransformCasing = field.nameTransformCasing;
  if (field.placeholder !== undefined) compiled.placeholder = field.placeholder;
  if (field.description !== undefined) compiled.description = field.description;
  if (field.isRequired !== undefined) compiled.isRequired = field.isRequired;
  if (field.errorMessage !== undefined) compiled.errorMessage = field.errorMessage;
  if (field.props && Object.keys(field.props).length > 0) compiled.props = field.props;

  return compiled;
}

/**
 * Compiles a definition into the options `defineMultiStepForm` accepts, including compiled step
 * validators. Use {@linkcode getConfigureOptions} for `configure`, or
 * {@linkcode createFormFromDefinition} to do both.
 *
 * ```ts
 * const form = defineMultiStepForm(compileDefinition(definition, { registry }))
 *   .configure(getConfigureOptions(definition))();
 * ```
 */
export function compileDefinition(
  definition: FormDefinition,
  options: CompileDefinitionOptions = {},
): CompiledDefinition {
  const registry = options.registry ?? createRegistry();
  const steps: Record<string, CompiledStep> = {};

  definition.steps.forEach((step, index) => {
    const key = getStepKey(index);
    const compiled: CompiledStep = {
      title: step.title,
      fields: Object.fromEntries(step.fields.map((field) => [field.key, compileField(field)])),
    };

    if (step.description !== undefined) compiled.description = step.description;
    if (step.nameTransformCasing !== undefined) compiled.nameTransformCasing = step.nameTransformCasing;

    if (step.validation?.kind === 'code') {
      Object.assign(compiled, options.resolveCode?.(step, { key, index }) ?? {});
    } else {
      const validator = compileStepValidator(step, registry, definition.settings);

      if (validator) compiled.validateFields = validator;
    }

    steps[key] = compiled;
  });

  const instances = definition.settings?.instances?.filter((name) => name.trim());

  return { steps, ...(instances && instances.length > 0 ? { instances } : {}) };
}

/** The `configure` options for a definition's form settings. */
export function getConfigureOptions(definition: FormDefinition): CompiledConfigureOptions {
  const settings = definition.settings;

  return {
    ...(settings?.nameTransformCasing ? { nameTransformCasing: settings.nameTransformCasing } : {}),
    ...(settings?.storageKey ? { storage: { key: settings.storageKey } } : {}),
  };
}

/**
 * Turns a definition into a configured multi-step form factory: the same thing the generated
 * source code exports as `createForm`.
 */
export function createFormFromDefinition(
  definition: FormDefinition,
  options: CompileDefinitionOptions = {},
) {
  // The compiled shape is only known at runtime, so the factory is untyped.
  const defined = defineMultiStepForm(compileDefinition(definition, options) as never) as unknown as {
    configure(options: CompiledConfigureOptions): (options?: { instance?: string }) => unknown;
  };

  return defined.configure(getConfigureOptions(definition));
}

// ---------------------------------------------------------------------------------------------
// Existing forms → definition
// ---------------------------------------------------------------------------------------------

export interface FromStepsConfigOptions {
  id?: string;
  idGenerator?: (kind: 'form' | 'step' | 'field') => string;
  /** Form settings, e.g. the casing passed to `configure`. */
  settings?: FormSettings;
  /** Field types, to tell choice fields apart. Defaults to the built-ins. */
  registry?: FormRegistry;
}

function inferFieldType(config: Record<string, unknown>, schema: SchemaNode) {
  if (schema.kind === 'date') return 'date';
  if (typeof config.type === 'string') return config.type;

  switch (schema.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'array':
    case 'object':
      return schema.kind;
    default:
      return 'object';
  }
}

/**
 * Reads a hand-written steps config (the `steps` passed to `defineMultiStepForm`, also available
 * as `schema.stepSchema.original`) into a definition the builder can edit.
 *
 * Plain data (titles, labels, placeholders, defaults, field types, casing) becomes editable, and
 * each field's schema is inferred from its default value. Step logic written as functions or
 * validator objects (`isComplete`, `validateFields`) is kept as `validation: { kind: 'code' }`,
 * which the builder shows but cannot edit. Use `compileDefinition(definition, { resolveCode })`
 * to reattach it.
 */
export function fromStepsConfig(
  steps: Record<string, unknown>,
  options: FromStepsConfigOptions = {},
): FormDefinition {
  const id = options.idGenerator ?? createId;
  const registry = options.registry ?? createRegistry();
  const result: StepDefinition[] = [];

  // Steps run in step-number order, which is also how a multi-step form orders them.
  const entries = Object.entries(steps).sort(
    ([a], [b]) => Number.parseInt(a.replace('step', ''), 10) - Number.parseInt(b.replace('step', ''), 10),
  );

  for (const [stepKey, stepConfig] of entries) {
    if (typeof stepConfig !== 'object' || stepConfig === null) {
      throw new FormBuilderError({
        operation: 'fromStepsConfig',
        reason: `Step "${stepKey}" is not a plain object. Lazily loaded steps must be resolved (schema.stepSchema.resolveStep) before reading them into a definition.`,
        target: stepKey,
      });
    }

    const config = stepConfig as Record<string, unknown>;
    const fields = (config.fields ?? {}) as Record<string, Record<string, unknown>>;
    const step: StepDefinition = {
      id: id('step'),
      title: typeof config.title === 'string' ? config.title : stepKey,
      fields: Object.entries(fields).map(([fieldKey, fieldConfig]) => {
        let schema = inferSchema(fieldConfig.defaultValue);
        const type = inferFieldType(fieldConfig, schema);
        const props =
          fieldConfig.props && typeof fieldConfig.props === 'object'
            ? (toJsonValue(fieldConfig.props) as JsonObject)
            : undefined;
        const options = Array.isArray(props?.options) ? props.options : undefined;

        // Choice fields: their options are the allowed values.
        if (options && registry.getFieldType(type)?.id === 'choice') {
          schema = {
            kind: 'enum',
            values: options.flatMap((option) =>
              option && typeof option === 'object' && !Array.isArray(option) && typeof option.value === 'string'
                ? [option.value]
                : [],
            ),
          };
        }

        const field: FieldDefinition = {
          id: id('field'),
          key: fieldKey,
          type,
          schema,
          defaultValue: toJsonValue(fieldConfig.defaultValue),
        };

        if (typeof fieldConfig.label === 'string' || fieldConfig.label === false) {
          field.label = fieldConfig.label;
        }
        if (isCasingValid(fieldConfig.nameTransformCasing)) {
          field.nameTransformCasing = fieldConfig.nameTransformCasing;
        }
        if (typeof fieldConfig.placeholder === 'string') field.placeholder = fieldConfig.placeholder;
        if (typeof fieldConfig.description === 'string') field.description = fieldConfig.description;
        if (typeof fieldConfig.isRequired === 'boolean') field.isRequired = fieldConfig.isRequired;
        if (typeof fieldConfig.errorMessage === 'string') field.errorMessage = fieldConfig.errorMessage;
        if (props) field.props = props;

        return field;
      }),
    };

    if (typeof config.description === 'string') step.description = config.description;
    if (isCasingValid(config.nameTransformCasing)) step.nameTransformCasing = config.nameTransformCasing;

    if (config.validateFields !== undefined) {
      step.validation = { kind: 'code', ref: `${stepKey}.validateFields` };
    } else if (typeof config.isComplete === 'function') {
      step.validation = { kind: 'code', ref: `${stepKey}.isComplete` };
    }

    result.push(step);
  }

  return {
    schemaVersion: DEFINITION_SCHEMA_VERSION,
    id: options.id ?? id('form'),
    revision: 0,
    ...(options.settings ? { settings: options.settings } : {}),
    steps: result,
  };
}

// ---------------------------------------------------------------------------------------------
// Definition → source code
// ---------------------------------------------------------------------------------------------

export interface GenerateCodeOptions {
  registry?: FormRegistry;
  /** The package `defineMultiStepForm` is imported from. @default '@jfdevelops/react-multi-step-form' */
  importFrom?: string;
  /** The exported factory's name. @default 'createForm' */
  factoryName?: string;
  /** The exported instance's name, for forms without named instances. @default 'form' */
  instanceName?: string;
}

export interface GeneratedStep {
  key: `step${number}`;
  title: string;
  /** The validator library, when the step has builder-managed validation. */
  library?: string;
  /** The step's Standard Schema validator, as an exported constant. */
  validator?: { name: string; code: string };
}

export interface GeneratedType {
  /** The exported type alias, e.g. `Step2Faces`. */
  name: string;
  /** The type, e.g. `Array<{ id: string }>`. */
  type: string;
  stepKey: string;
  fieldKey: string;
}

export interface GeneratedCode {
  /** The whole TypeScript module. */
  source: string;
  /** npm packages the module imports, so an editor can load their types. */
  packages: string[];
  steps: GeneratedStep[];
  /** Exported type aliases for field values TypeScript can't infer from the default value. */
  types: GeneratedType[];
}

function indent(text: string, spaces: number) {
  const pad = ' '.repeat(spaces);

  return text
    .split('\n')
    .map((line, index) => (index === 0 || line === '' ? line : pad + line))
    .join('\n');
}

function block(entries: readonly string[]) {
  return `{\n${entries.map((entry) => `  ${indent(entry, 2)}`).join('\n')}\n}`;
}

const PACKAGE_PATTERN = /from '([^']+)'/;

/**
 * Writes the definition as a TypeScript module that defines the form by hand, so a form designed
 * in a builder can be committed to an application with full type inference. Also returns each
 * step's validator and the value types on their own, for showing next to the builder.
 */
export function generateCode(
  definition: FormDefinition,
  options: GenerateCodeOptions = {},
): GeneratedCode {
  const registry = options.registry ?? createRegistry();
  const settings = definition.settings;
  const importFrom = options.importFrom ?? '@jfdevelops/react-multi-step-form';
  const imports = new Set<string>([`import { defineMultiStepForm } from '${importFrom}';`]);
  const declarations = new Set<string>();
  const types: GeneratedType[] = [];
  const validators: string[] = [];
  const steps: GeneratedStep[] = [];
  const stepBlocks: string[] = [];

  definition.steps.forEach((step, index) => {
    const key = getStepKey(index);
    const generated: GeneratedStep = { key, title: step.title };
    const entries: string[] = [`title: ${JSON.stringify(step.title)},`];

    if (step.description !== undefined) entries.push(`description: ${JSON.stringify(step.description)},`);
    if (step.nameTransformCasing !== undefined) {
      entries.push(`nameTransformCasing: ${JSON.stringify(step.nameTransformCasing)},`);
    }

    const fieldBlocks = step.fields.map((field) => {
      const lines: string[] = [];
      let value = toValueSource(field.schema, field.defaultValue);
      const matches = matchesSchema({ ...field.schema, optional: false }, field.defaultValue);
      const primitive = field.defaultValue === null || typeof field.defaultValue !== 'object';

      if ((needsTypeAnnotation(field.schema) || !matches) && (matches || primitive)) {
        const name = changeCasing(`${key} ${field.key}`, 'pascal');
        const type = matches
          ? toTypeScript(field.schema)
          : `${toTypeScript(field.schema)} | ${JSON.stringify(field.defaultValue)}`;

        types.push({ name, type, stepKey: key, fieldKey: field.key });
        value = `${value} as ${name}`;
      }

      lines.push(`defaultValue: ${value},`);
      lines.push(`type: ${JSON.stringify(fieldType(field))},`);
      if (field.label !== undefined) lines.push(`label: ${JSON.stringify(field.label)},`);
      if (field.nameTransformCasing !== undefined) {
        lines.push(`nameTransformCasing: ${JSON.stringify(field.nameTransformCasing)},`);
      }
      if (field.placeholder !== undefined) lines.push(`placeholder: ${JSON.stringify(field.placeholder)},`);
      if (field.description !== undefined) lines.push(`description: ${JSON.stringify(field.description)},`);
      if (field.isRequired !== undefined) lines.push(`isRequired: ${field.isRequired},`);
      if (field.errorMessage !== undefined) lines.push(`errorMessage: ${JSON.stringify(field.errorMessage)},`);
      if (field.props && Object.keys(field.props).length > 0) {
        lines.push(`props: ${toValueSource(undefined, field.props)},`);
      }

      return `${formatPropertyKey(field.key)}: ${block(lines)},`;
    });

    entries.push(`fields: ${block(fieldBlocks)},`);

    if (step.validation?.kind === 'code') {
      entries.push(`// validateFields lives in application code (${step.validation.ref}).`);
    } else {
      const built = buildStepValidator(step, registry, settings);

      if (built) {
        const name = `${key}Schema`;

        built.imports.forEach((line) => imports.add(line));
        built.declarations.forEach((line) => declarations.add(line));
        validators.push(`export const ${name} = ${built.code};`);
        entries.push(`validateFields: ${name},`);
        generated.library = built.library;
        generated.validator = { name, code: built.code };
      }
    }

    steps.push(generated);
    stepBlocks.push(`${key}: ${block(entries)},`);
  });

  const instances = settings?.instances?.filter((name) => name.trim()) ?? [];
  const defineEntries = [`steps: ${block(stepBlocks)},`];

  if (instances.length > 0) defineEntries.push(`instances: ${JSON.stringify(instances)},`);

  const configureEntries: string[] = [];

  if (settings?.nameTransformCasing) {
    configureEntries.push(`nameTransformCasing: ${JSON.stringify(settings.nameTransformCasing)},`);
  }
  if (settings?.storageKey) {
    configureEntries.push(`storage: { key: ${JSON.stringify(settings.storageKey)} },`);
  }

  const factoryName = options.factoryName ?? 'createForm';
  const instanceName = options.instanceName ?? 'form';
  const factory = `export const ${factoryName} = defineMultiStepForm(${block(defineEntries)}).configure(${
    configureEntries.length > 0 ? block(configureEntries) : ''
  });`;

  const source =
    [
      [...imports].join('\n'),
      ...(declarations.size > 0 ? [[...declarations].join('\n\n')] : []),
      ...(types.length > 0 ? [types.map(({ name, type }) => `export type ${name} = ${type};`).join('\n\n')] : []),
      ...(validators.length > 0 ? [validators.join('\n\n')] : []),
      factory,
      ...(instances.length === 0 ? [`export const ${instanceName} = ${factoryName}();`] : []),
    ].join('\n\n') + '\n';

  const packages = [...imports].flatMap((line) => {
    const match = PACKAGE_PATTERN.exec(line);
    return match ? [match[1]!] : [];
  });

  return { source, packages: [...new Set(packages)], steps, types };
}

/** {@linkcode generateCode}'s module source. */
export function toSource(definition: FormDefinition, options: GenerateCodeOptions = {}) {
  return generateCode(definition, options).source;
}
