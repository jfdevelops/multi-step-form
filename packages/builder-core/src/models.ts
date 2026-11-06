/**
 * View models: plain data derived from a builder snapshot, ready for any UI layer to render.
 * They contain no DOM or framework code.
 */
import type { BuilderSnapshot, FormBuilder } from './builder.js';
import {
  CHECKS_BY_VALUE_TYPE,
  getStepKey,
  getValueTypeFromFieldType,
  type FieldCheckName,
  type FieldDefinition,
  type FieldOption,
  type FieldSchemaSpec,
  type FieldValueType,
  type StepDefinition,
  type ValidatorLibrary,
} from './definition.js';
import type { DefinitionIssue } from './issues.js';
import {
  prop,
  section,
  type FormRegistry,
  type InspectorSection,
  type PropertyDescriptor,
  type ResolvedFieldType,
} from './registry.js';
import { inferFieldSpec } from './validation.js';

// ---------------------------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------------------------

export interface PaletteItem {
  type: string;
  label: string;
  category: string;
  icon?: string;
  keywords: readonly string[];
}

export interface PaletteModel {
  search: string;
  categories: { name: string; items: PaletteItem[] }[];
  /** Every matching item, flattened in category order. */
  items: PaletteItem[];
}

/** Groups the registry's field types by category, filtered by a search query. */
export function getPaletteModel(registry: FormRegistry, search = ''): PaletteModel {
  const query = search.trim().toLowerCase();
  const categories = new Map<string, PaletteItem[]>();

  for (const fieldType of registry.fieldTypes) {
    const haystack = [fieldType.label, fieldType.type, fieldType.category, ...fieldType.keywords]
      .join(' ')
      .toLowerCase();

    if (query && !haystack.includes(query)) continue;

    const item: PaletteItem = {
      type: fieldType.type,
      label: fieldType.label,
      category: fieldType.category,
      keywords: fieldType.keywords,
      ...(fieldType.icon ? { icon: fieldType.icon } : {}),
    };
    categories.set(fieldType.category, [...(categories.get(fieldType.category) ?? []), item]);
  }

  const grouped = [...categories].map(([name, items]) => ({ name, items }));

  return { search, categories: grouped, items: grouped.flatMap((group) => group.items) };
}

// ---------------------------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------------------------

export interface CanvasStep {
  id: string;
  key: string;
  title: string;
  index: number;
  isActive: boolean;
  isSelected: boolean;
  fieldCount: number;
  issues: readonly DefinitionIssue[];
}

export interface CanvasField {
  id: string;
  key: string;
  index: number;
  field: FieldDefinition;
  /** `undefined` when the field's type is not registered. */
  fieldType: ResolvedFieldType | undefined;
  isSelected: boolean;
  issues: readonly DefinitionIssue[];
}

export interface CanvasModel {
  steps: CanvasStep[];
  activeStep: StepDefinition | null;
  fields: CanvasField[];
}

function issuesByNode(issues: readonly DefinitionIssue[]) {
  const map = new Map<string, DefinitionIssue[]>();

  for (const issue of issues) {
    map.set(issue.nodeId, [...(map.get(issue.nodeId) ?? []), issue]);
  }

  return map;
}

const NO_ISSUES: readonly DefinitionIssue[] = Object.freeze([]);

export function getCanvasModel(snapshot: BuilderSnapshot): CanvasModel {
  const { definition, selection, activeStepId, registry } = snapshot;
  const byNode = issuesByNode(snapshot.issues);
  const activeStep = definition.steps.find((step) => step.id === activeStepId) ?? null;
  const selectedFields = new Set(selection.type === 'fields' ? selection.fieldIds : []);

  return {
    steps: definition.steps.map((step, index) => ({
      id: step.id,
      key: getStepKey(index),
      title: step.title,
      index,
      isActive: step.id === activeStepId,
      isSelected: selection.type === 'step' && selection.stepId === step.id,
      fieldCount: step.fields.length,
      issues: byNode.get(step.id) ?? NO_ISSUES,
    })),
    activeStep,
    fields: (activeStep?.fields ?? []).map((field, index) => ({
      id: field.id,
      key: field.key,
      index,
      field,
      fieldType: registry.getFieldType(field.type),
      isSelected: selectedFields.has(field.id),
      issues: byNode.get(field.id) ?? NO_ISSUES,
    })),
  };
}

// ---------------------------------------------------------------------------------------------
// Inspector
// ---------------------------------------------------------------------------------------------

export type InspectorTarget =
  | { type: 'none' }
  | { type: 'step'; step: StepDefinition }
  | { type: 'fields'; step: StepDefinition; fields: readonly FieldDefinition[] };

export interface InspectorProperty {
  descriptor: PropertyDescriptor;
  /** The value, or the first target's value when `mixed`. */
  value: unknown;
  /** Several targets are selected and their values differ. */
  mixed: boolean;
  error?: string;
}

export interface InspectorModel {
  target: InspectorTarget;
  sections: { id: string; title: string; properties: InspectorProperty[] }[];
}

/** Reads a dot path, e.g. `props.options`. */
export function getPath(value: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, segment) =>
        current && typeof current === 'object'
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      value,
    );
}

function getOptions(field: FieldDefinition): FieldOption[] {
  const options = field.props?.options;

  return Array.isArray(options) ? (options as unknown as FieldOption[]) : [];
}

function defaultValueDescriptor(field: FieldDefinition, valueType: FieldValueType) {
  const options = getOptions(field);
  const base = { label: 'Default value' };

  if (options.length > 0 && valueType === 'string') {
    return prop.select('defaultValue', {
      ...base,
      options: [{ value: '', label: 'None' }, ...options],
    });
  }

  switch (valueType) {
    case 'string':
      return prop.text('defaultValue', base);
    case 'number':
      return prop.number('defaultValue', base);
    case 'boolean':
      return prop.switch('defaultValue', base);
    case 'date':
      return prop.date('defaultValue', base);
    default:
      return prop.json('defaultValue', base);
  }
}

const STEP_SECTIONS: readonly InspectorSection[] = [
  section('Step', [
    prop.text('title', { label: 'Title' }),
    prop.textarea('description', { label: 'Description' }),
  ]),
];

function fieldSections(
  fields: readonly FieldDefinition[],
  registry: FormRegistry,
): InspectorSection[] {
  const single = fields.length === 1 ? fields[0] : undefined;
  const sameType = fields.every((field) => field.type === fields[0]?.type);
  const valueType = getValueTypeFromFieldType(fields[0]?.type ?? '');
  const textual = (field: FieldDefinition) => {
    const type = getValueTypeFromFieldType(field.type);

    return type === 'string' || type === 'number';
  };

  const general: PropertyDescriptor[] = [
    ...(single
      ? [prop.key('key', { label: 'Key', description: 'The field name in the submitted data' })]
      : []),
    prop.text('label', { label: 'Label' }),
    prop.text('placeholder', { label: 'Placeholder', visibleWhen: textual }),
    prop.textarea('description', { label: 'Help text' }),
    prop.switch('isRequired', { label: 'Required' }),
    prop.text('errorMessage', { label: 'Error message' }),
  ];

  const sections: InspectorSection[] = [section('General', general)];

  if (single) {
    sections.push(section('Value', [defaultValueDescriptor(single, valueType)]));
  }

  if (sameType && fields[0]) {
    sections.push(...(registry.getFieldType(fields[0].type)?.inspector ?? []));
  }

  return sections;
}

function getInspectorTarget(snapshot: BuilderSnapshot): InspectorTarget {
  const { definition, selection, activeStepId } = snapshot;

  if (selection.type === 'fields') {
    const step = definition.steps.find((candidate) => candidate.id === selection.stepId);
    const fields = (step?.fields ?? []).filter((field) => selection.fieldIds.includes(field.id));

    if (step && fields.length > 0) return { type: 'fields', step, fields };
  }

  const stepId = selection.type === 'step' ? selection.stepId : activeStepId;
  const step = definition.steps.find((candidate) => candidate.id === stepId);

  return step ? { type: 'step', step } : { type: 'none' };
}

/**
 * Describes the properties to show for the current selection. With no field selected it
 * inspects the active step. With several fields selected it shows the properties they share.
 */
export function getInspectorModel(snapshot: BuilderSnapshot): InspectorModel {
  const target = getInspectorTarget(snapshot);

  if (target.type === 'none') return { target, sections: [] };

  const nodes: readonly (StepDefinition | FieldDefinition)[] =
    target.type === 'step' ? [target.step] : target.fields;
  const sections =
    target.type === 'step' ? STEP_SECTIONS : fieldSections(target.fields, snapshot.registry);

  return {
    target,
    sections: sections
      .map((current) => ({
        id: current.id,
        title: current.title,
        properties: current.properties
          .filter(
            (descriptor) =>
              target.type === 'step' ||
              !descriptor.visibleWhen ||
              target.fields.every((field) => descriptor.visibleWhen!(field)),
          )
          .map((descriptor): InspectorProperty => {
            const values = nodes.map((node) => getPath(node, descriptor.path));
            const first = values[0];
            const mixed = values.some((value) => JSON.stringify(value) !== JSON.stringify(first));
            const issue = snapshot.issues.find(
              (candidate) =>
                nodes.some((node) => node.id === candidate.nodeId) &&
                candidate.path === descriptor.path,
            );
            const validationError =
              target.type === 'fields' && !mixed
                ? descriptor.validate?.(first, target.fields[0]!)
                : undefined;
            const error = issue?.message ?? validationError;

            return { descriptor, value: first, mixed, ...(error ? { error } : {}) };
          }),
      }))
      .filter((current) => current.properties.length > 0),
  };
}

/** Writes an inspector value to every inspected node as one undo step. */
export function setInspectorValue(builder: FormBuilder, path: string, value: unknown) {
  const target = getInspectorTarget(builder.getSnapshot());

  if (target.type === 'step') {
    builder.steps.update(target.step.id, { [path]: value });
    return;
  }

  if (target.type === 'fields') {
    builder.history.transaction(() => {
      for (const field of target.fields) builder.fields.setProperty(field.id, path, value);
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Step validation
// ---------------------------------------------------------------------------------------------

export type StepValidationMode = 'none' | 'required' | 'schema' | 'code';

export interface StepValidationField {
  field: FieldDefinition;
  /** The rules in effect: explicit ones, else inferred from the field. */
  rules: FieldSchemaSpec;
  /** Whether `rules` were set explicitly rather than inferred. */
  isCustomized: boolean;
  /** Whether an empty value fails validation. */
  isRequired: boolean;
  availableChecks: readonly FieldCheckName[];
  issues: readonly DefinitionIssue[];
}

export interface StepValidationModel {
  stepId: string;
  mode: StepValidationMode;
  library?: ValidatorLibrary;
  /** The validator libraries the registry offers. */
  libraries: { library: string; label: string }[];
  /** For `mode: 'code'`: where the validator lives. */
  codeRef?: string;
  fields: StepValidationField[];
}

export function getStepValidationModel(
  snapshot: BuilderSnapshot,
  stepId: string,
): StepValidationModel | undefined {
  const step = snapshot.definition.steps.find((candidate) => candidate.id === stepId);

  if (!step) return undefined;

  const validation = step.validation;
  const byNode = issuesByNode(snapshot.issues);
  const mode: StepValidationMode = validation?.kind ?? 'none';

  return {
    stepId,
    mode,
    ...(validation?.kind === 'schema' ? { library: validation.library } : {}),
    ...(validation?.kind === 'code' ? { codeRef: validation.ref } : {}),
    libraries: snapshot.registry.validators.map(({ library, label }) => ({ library, label })),
    fields: step.fields.map((field) => {
      const explicit = validation?.kind === 'schema' ? validation.fields[field.key] : undefined;
      const rules = explicit ?? inferFieldSpec(field, snapshot.registry);

      return {
        field,
        rules,
        isCustomized: explicit !== undefined,
        isRequired: !(rules.optional ?? !field.isRequired),
        availableChecks: CHECKS_BY_VALUE_TYPE[rules.type],
        issues: (byNode.get(field.id) ?? []).filter((issue) =>
          issue.path?.startsWith('validation'),
        ),
      };
    }),
  };
}

/** Switches a step between no validation, required-only, schema (with a library) and back. */
export function setStepValidationMode(
  builder: FormBuilder,
  stepId: string,
  mode: Exclude<StepValidationMode, 'code'>,
  library: ValidatorLibrary = 'builtin',
) {
  if (mode === 'none') builder.validation.set(stepId, undefined);
  else if (mode === 'required') builder.validation.set(stepId, { kind: 'required' });
  else builder.validation.useLibrary(stepId, library);
}
