import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createId,
  DEFINITION_SCHEMA_VERSION,
  getStepKey,
  getValueTypeFromFieldType,
  type FieldDefinition,
  type FormDefinition,
  type JsonObject,
  type JsonValue,
  type StepDefinition,
} from './definition.js';
import { FormBuilderError } from './errors.js';
import { createRegistry, type FormRegistry } from './registry.js';
import { compileStepValidator, emitStepValidator } from './validation.js';
import type { StepValues } from './validators/types.js';

/** A field in the shape `defineMultiStepForm` accepts. */
export interface CompiledField {
  defaultValue: unknown;
  type?: string;
  label?: string | false;
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
  fields: Record<string, CompiledField>;
  validateFields?: StandardSchemaV1<StepValues, StepValues>;
  isComplete?: (values: StepValues) => boolean;
}

export interface CompiledDefinition {
  steps: Record<string, CompiledStep>;
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

function isDateField(field: FieldDefinition, registry: FormRegistry) {
  const valueType =
    registry.getFieldType(field.type)?.valueType ??
    getValueTypeFromFieldType(field.type);

  return valueType === 'date';
}

function compileField(field: FieldDefinition, registry: FormRegistry): CompiledField {
  const date = isDateField(field, registry);
  const compiled: CompiledField = {
    defaultValue:
      date && typeof field.defaultValue === 'string'
        ? new Date(field.defaultValue)
        : field.defaultValue,
    // Date fields use core's narrower `'date' | 'string'` type option.
    type: date ? 'date' : field.type,
  };

  if (field.label !== undefined) compiled.label = field.label;
  if (field.placeholder !== undefined) compiled.placeholder = field.placeholder;
  if (field.isRequired !== undefined) compiled.isRequired = field.isRequired;
  if (field.errorMessage !== undefined) compiled.errorMessage = field.errorMessage;
  if (field.description !== undefined) compiled.description = field.description;
  if (field.props && Object.keys(field.props).length > 0) compiled.props = field.props;

  return compiled;
}

/**
 * Compiles a definition into the configuration `defineMultiStepForm` accepts, including
 * compiled step validators.
 *
 * ```ts
 * const form = defineMultiStepForm(compileDefinition(definition, { registry })).configure()();
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
      fields: Object.fromEntries(
        step.fields.map((field) => [field.key, compileField(field, registry)]),
      ),
    };

    if (step.description !== undefined) compiled.description = step.description;

    if (step.validation?.kind === 'code') {
      Object.assign(compiled, options.resolveCode?.(step, { key, index }) ?? {});
    } else {
      const validator = compileStepValidator(step, registry);

      if (validator) compiled.validateFields = validator;
    }

    steps[key] = compiled;
  });

  return { steps };
}

// ---------------------------------------------------------------------------------------------
// Existing forms → definition
// ---------------------------------------------------------------------------------------------

export interface FromStepsConfigOptions {
  id?: string;
  idGenerator?: (kind: 'form' | 'step' | 'field') => string;
}

function toJson(value: unknown): JsonValue {
  if (value instanceof Date) return value.toISOString();

  return JSON.parse(JSON.stringify(value ?? null)) as JsonValue;
}

function inferType(config: Record<string, unknown>) {
  const value = config.defaultValue;

  if (value instanceof Date) return 'date';
  if (typeof config.type === 'string') return config.type;
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array';
  if (value && typeof value === 'object') return 'object';

  return 'string';
}

/**
 * Reads a hand-written steps config (the `steps` passed to `defineMultiStepForm`, also available
 * as `schema.stepSchema.original`) into a definition the builder can edit.
 *
 * Plain data (titles, labels, placeholders, defaults, field types) becomes editable. Step logic
 * written as functions or validator objects (`isComplete`, `validateFields`) is kept as
 * `validation: { kind: 'code' }`, which the builder shows but cannot edit. Use
 * `compileDefinition(definition, { resolveCode })` to reattach it.
 */
export function fromStepsConfig(
  steps: Record<string, unknown>,
  options: FromStepsConfigOptions = {},
): FormDefinition {
  const id = options.idGenerator ?? createId;
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
        const field: FieldDefinition = {
          id: id('field'),
          key: fieldKey,
          type: inferType(fieldConfig),
          defaultValue: toJson(fieldConfig.defaultValue),
        };

        if (typeof fieldConfig.label === 'string' || fieldConfig.label === false) {
          field.label = fieldConfig.label;
        }
        if (typeof fieldConfig.placeholder === 'string') field.placeholder = fieldConfig.placeholder;
        if (typeof fieldConfig.description === 'string') field.description = fieldConfig.description;
        if (typeof fieldConfig.isRequired === 'boolean') field.isRequired = fieldConfig.isRequired;
        if (typeof fieldConfig.errorMessage === 'string') field.errorMessage = fieldConfig.errorMessage;
        if (fieldConfig.props && typeof fieldConfig.props === 'object') {
          field.props = toJson(fieldConfig.props) as JsonObject;
        }

        return field;
      }),
    };

    if (typeof config.description === 'string') step.description = config.description;

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
    steps: result,
  };
}

// ---------------------------------------------------------------------------------------------
// Definition → source code
// ---------------------------------------------------------------------------------------------

export interface ToSourceOptions {
  registry?: FormRegistry;
  /** The package `defineMultiStepForm` is imported from. @default '@jfdevelops/react-multi-step-form' */
  importFrom?: string;
  /** The exported constant's name. @default 'form' */
  exportName?: string;
}

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const propertyKey = (key: string) => (IDENTIFIER.test(key) ? key : JSON.stringify(key));

function indent(text: string, spaces: number) {
  const pad = ' '.repeat(spaces);

  return text
    .split('\n')
    .map((line, index) => (index === 0 ? line : pad + line))
    .join('\n');
}

/**
 * Writes a TypeScript module that defines the form by hand, so a form designed in a builder can
 * be committed to an application with full type inference.
 */
export function toSource(definition: FormDefinition, options: ToSourceOptions = {}) {
  const registry = options.registry ?? createRegistry();
  const imports = new Set<string>([
    `import { defineMultiStepForm } from '${options.importFrom ?? '@jfdevelops/react-multi-step-form'}';`,
  ]);
  const declarations = new Set<string>();
  const stepBlocks: string[] = [];

  definition.steps.forEach((step, index) => {
    const lines: string[] = [`title: ${JSON.stringify(step.title)},`];

    if (step.description !== undefined) {
      lines.push(`description: ${JSON.stringify(step.description)},`);
    }

    const fieldBlocks = step.fields.map((field) => {
      const compiled = compileField(field, registry);
      const entries = Object.entries(compiled).map(([key, value]) =>
        key === 'defaultValue' && value instanceof Date
          ? `defaultValue: new Date(${JSON.stringify(value.toISOString())}),`
          : `${key}: ${indent(JSON.stringify(value, null, 2), 2)},`,
      );

      return `${propertyKey(field.key)}: {\n  ${entries.join('\n  ')}\n},`;
    });

    lines.push(`fields: {\n  ${indent(fieldBlocks.join('\n'), 2)}\n},`);

    if (step.validation?.kind === 'code') {
      lines.push(`// TODO: validation lives in application code (${step.validation.ref}).`);
    } else {
      const emitted = emitStepValidator(step, registry);

      if (emitted) {
        emitted.imports.forEach((line) => imports.add(line));
        emitted.declarations.forEach((line) => declarations.add(line));
        lines.push(`validateFields: ${indent(emitted.code, 0)},`);
      }
    }

    stepBlocks.push(`${getStepKey(index)}: {\n  ${indent(lines.join('\n'), 2)}\n},`);
  });

  return [
    [...imports].join('\n'),
    ...(declarations.size > 0 ? [[...declarations].join('\n')] : []),
    `export const ${options.exportName ?? 'form'} = defineMultiStepForm({\n  steps: {\n    ${indent(stepBlocks.join('\n'), 4)}\n  },\n});`,
  ].join('\n\n') + '\n';
}
