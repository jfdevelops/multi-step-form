/**
 * View models: plain data derived from a builder snapshot, ready for any UI layer to render.
 * They contain no DOM or framework code.
 */
import {
  CASING_TYPES,
  changeCasing,
  type CasingType,
} from '@jfdevelops/multi-step-form-core';
import type { BuilderSnapshot, FormBuilder } from './builder.js';
import {
  getStepKey,
  resolveFieldCasing,
  resolveFieldLabel,
  resolveStepLibrary,
  type FieldDefinition,
  type FieldOption,
  type FormSettings,
  type StepDefinition,
  type ValidatorLibrary,
} from './definition.js';
import type { DefinitionIssue } from './issues.js';
import {
  prop,
  section,
  type FormRegistry,
  type InputTypeDefinition,
  type InspectorSection,
  type PropertyDescriptor,
  type ResolvedFieldType,
} from './registry.js';
import {
  CHECKS_BY_KIND,
  createSchemaNode,
  ITEM_SEGMENT,
  optionSegment,
  SCHEMA_KINDS,
  VALUE_SEGMENT,
  type SchemaCheck,
  type SchemaCheckName,
  type SchemaKind,
  type SchemaNode,
  type SchemaPath,
} from './schema.js';

// ---------------------------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------------------------

export interface PaletteItem {
  /** The field type's palette id, e.g. `'text'`. */
  id: string;
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
    const haystack = [
      fieldType.label,
      fieldType.id,
      fieldType.category,
      ...fieldType.keywords,
      ...fieldType.inputTypes.map((input) => input.label),
    ]
      .join(' ')
      .toLowerCase();

    if (query && !haystack.includes(query)) continue;

    const item: PaletteItem = {
      id: fieldType.id,
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
  /** The label the form shows, resolved from the key and casing like a multi-step form does. */
  label: string | undefined;
  /** `undefined` when the field's type is not registered. */
  fieldType: ResolvedFieldType | undefined;
  inputType: InputTypeDefinition | undefined;
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
      label: resolveFieldLabel(field, activeStep ?? undefined, definition.settings),
      fieldType: registry.getFieldType(field.type),
      inputType: registry.getInputType(field.type),
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
  /**
   * What applies when the property is left empty, e.g. the label derived from the key or the
   * inherited casing. Good as a placeholder.
   */
  hint?: string;
  /** The first inspected step or field, e.g. for the `value` control to read its schema. */
  node: StepDefinition | FieldDefinition;
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

/** `nameTransformCasing` choices, previewed on `sample`. */
export function getCasingOptions(sample: string, inherited: CasingType): FieldOption[] {
  return [
    { value: '', label: `Inherit (${inherited})` },
    ...CASING_TYPES.map((casing) => ({
      value: casing,
      label: `${casing} — ${changeCasing(sample, casing)}`,
    })),
  ];
}

function stepSections(snapshot: BuilderSnapshot, step: StepDefinition): InspectorSection[] {
  const inherited = snapshot.definition.settings?.nameTransformCasing ?? 'title';

  return [
    section('Step', [
      prop.text('title', { label: 'Title' }),
      prop.textarea('description', { label: 'Description' }),
      prop.casing('nameTransformCasing', {
        label: 'Label casing',
        description: 'How field keys in this step become labels',
        options: getCasingOptions(step.fields[0]?.key ?? 'firstName', inherited),
      }),
    ]),
  ];
}

const isTextual = (field: FieldDefinition) =>
  field.schema.kind === 'string' || field.schema.kind === 'number';

function fieldSections(
  snapshot: BuilderSnapshot,
  step: StepDefinition,
  fields: readonly FieldDefinition[],
): InspectorSection[] {
  const { registry, definition } = snapshot;
  const single = fields.length === 1 ? fields[0] : undefined;
  const fieldType = registry.getFieldType(fields[0]?.type ?? '');
  const sameFieldType = fields.every((field) => registry.getFieldType(field.type)?.id === fieldType?.id);
  const inheritedCasing = step.nameTransformCasing ?? definition.settings?.nameTransformCasing ?? 'title';

  const general: PropertyDescriptor[] = [
    ...(single
      ? [prop.key('key', { label: 'Key', description: 'The field name in the form data. The label is derived from it.' })]
      : []),
    ...(sameFieldType && fieldType && fieldType.inputTypes.length > 1
      ? [
          prop.select('type', {
            label: 'Input type',
            options: fieldType.inputTypes.map((input) => ({ value: input.type, label: input.label })),
          }),
        ]
      : []),
    prop.text('label', { label: 'Label', description: 'Leave empty to derive it from the key' }),
    prop.casing('nameTransformCasing', {
      label: 'Label casing',
      options: getCasingOptions(single?.key ?? 'firstName', inheritedCasing),
    }),
    prop.text('placeholder', { label: 'Placeholder', visibleWhen: isTextual }),
    prop.textarea('description', { label: 'Help text' }),
    prop.switch('isRequired', { label: 'Required' }),
    prop.text('errorMessage', { label: 'Error message', description: 'Shown when a required field is empty' }),
  ];

  const sections: InspectorSection[] = [section('General', general)];

  if (single) {
    sections.push(section('Value', [prop.value('defaultValue', { label: 'Default value' })]));
  }

  if (sameFieldType && fieldType) {
    sections.push(...(fieldType.inspector ?? []));
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

function hintFor(
  snapshot: BuilderSnapshot,
  target: Exclude<InspectorTarget, { type: 'none' }>,
  path: string,
): string | undefined {
  const settings = snapshot.definition.settings;

  if (target.type === 'step') {
    return path === 'nameTransformCasing' ? (settings?.nameTransformCasing ?? 'title') : undefined;
  }

  const field = target.fields[0]!;

  if (path === 'label') {
    return resolveFieldLabel({ ...field, label: undefined }, target.step, settings);
  }

  if (path === 'nameTransformCasing') {
    return resolveFieldCasing({}, target.step, settings);
  }

  return undefined;
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
    target.type === 'step'
      ? stepSections(snapshot, target.step)
      : fieldSections(snapshot, target.step, target.fields);

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
            const hint = hintFor(snapshot, target, descriptor.path);

            return {
              descriptor,
              value: first,
              mixed,
              node: nodes[0]!,
              ...(hint !== undefined ? { hint } : {}),
              ...(error ? { error } : {}),
            };
          }),
      }))
      .filter((current) => current.properties.length > 0),
  };
}

const CLEARED_WHEN_EMPTY = new Set(['label', 'nameTransformCasing', 'placeholder', 'description', 'errorMessage']);

/**
 * Writes an inspector value to every inspected node as one undo step. Empty strings clear
 * optional text properties, so the derived label or inherited casing applies again.
 */
export function setInspectorValue(builder: FormBuilder, path: string, value: unknown) {
  const target = getInspectorTarget(builder.getSnapshot());
  const next = value === '' && CLEARED_WHEN_EMPTY.has(path) ? undefined : value;

  if (target.type === 'step') {
    builder.steps.update(target.step.id, { [path]: next });
    return;
  }

  if (target.type === 'fields') {
    builder.history.transaction(() => {
      for (const field of target.fields) builder.fields.setProperty(field.id, path, next);
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Step validation
// ---------------------------------------------------------------------------------------------

/**
 * - `inherit`: uses the form's default library (or none).
 * - `none`: never validated; always complete.
 * - `schema`: uses `library`.
 * - `code`: validated by application code the builder doesn't edit.
 */
export type StepValidationMode = 'inherit' | 'none' | 'schema' | 'code';

export interface StepValidationModel {
  stepId: string;
  mode: StepValidationMode;
  /** The library picked for this step (`mode: 'schema'`). */
  library?: ValidatorLibrary;
  /** The library the step actually compiles with, if any. */
  effectiveLibrary?: ValidatorLibrary;
  /** The form's default library. */
  formLibrary?: ValidatorLibrary;
  /** The validator libraries the registry offers. */
  libraries: { library: string; label: string }[];
  /** For `mode: 'code'`: where the validator lives. */
  codeRef?: string;
  issues: readonly DefinitionIssue[];
}

export function getStepValidationModel(
  snapshot: BuilderSnapshot,
  stepId: string,
): StepValidationModel | undefined {
  const step = snapshot.definition.steps.find((candidate) => candidate.id === stepId);

  if (!step) return undefined;

  const validation = step.validation;
  const settings = snapshot.definition.settings;
  const mode: StepValidationMode =
    validation === undefined ? 'inherit' : validation.kind;
  const effectiveLibrary = resolveStepLibrary(step, settings);

  return {
    stepId,
    mode,
    ...(validation?.kind === 'schema' && validation.library ? { library: validation.library } : {}),
    ...(effectiveLibrary ? { effectiveLibrary } : {}),
    ...(settings?.validator ? { formLibrary: settings.validator } : {}),
    ...(validation?.kind === 'code' ? { codeRef: validation.ref } : {}),
    libraries: snapshot.registry.validators.map(({ library, label }) => ({ library, label })),
    issues: snapshot.issues.filter((issue) => issue.nodeId === stepId && issue.path === 'validation'),
  };
}

/** Sets a step's validation mode. `library` applies to `schema`. */
export function setStepValidationMode(
  builder: FormBuilder,
  stepId: string,
  mode: Exclude<StepValidationMode, 'code'>,
  library?: ValidatorLibrary,
) {
  if (mode === 'inherit') builder.validation.set(stepId, undefined);
  else if (mode === 'none') builder.validation.set(stepId, { kind: 'none' });
  else builder.validation.set(stepId, { kind: 'schema', ...(library ? { library } : {}) });
}

// ---------------------------------------------------------------------------------------------
// Form settings
// ---------------------------------------------------------------------------------------------

export interface FormSettingsModel {
  settings: FormSettings;
  /** Casing choices, previewed on a sample key. */
  casings: FieldOption[];
  libraries: { library: string; label: string }[];
  issues: readonly DefinitionIssue[];
}

export function getFormSettingsModel(snapshot: BuilderSnapshot): FormSettingsModel {
  const { definition } = snapshot;
  const sample = definition.steps.flatMap((step) => step.fields)[0]?.key ?? 'firstName';

  return {
    settings: definition.settings ?? {},
    casings: getCasingOptions(sample, 'title').slice(1),
    libraries: snapshot.registry.validators.map(({ library, label }) => ({ library, label })),
    issues: snapshot.issues.filter((issue) => issue.nodeId === definition.id),
  };
}

// ---------------------------------------------------------------------------------------------
// Schema editor
// ---------------------------------------------------------------------------------------------

export interface SchemaEditorNode {
  path: SchemaPath;
  schema: SchemaNode;
  /**
   * How the node relates to its parent: the field's value (`root`), an object property, a list's
   * items, a dictionary's values or a union option.
   */
  role: 'root' | 'property' | 'item' | 'value' | 'option';
  /** The property key or option number, for `property` and `option` nodes. */
  name?: string;
  /** Checks this node's kind accepts, minus ones that need a field's root (`equalsField`). */
  availableChecks: readonly SchemaCheckName[];
  /** Other fields in the step, for `equalsField`. */
  siblingKeys: readonly string[];
  issues: readonly DefinitionIssue[];
  children: SchemaEditorNode[];
}

export interface SchemaEditorModel {
  field: FieldDefinition;
  kinds: typeof SCHEMA_KINDS;
  root: SchemaEditorNode;
}

export function getSchemaEditorModel(
  snapshot: BuilderSnapshot,
  fieldId: string,
): SchemaEditorModel | undefined {
  const step = snapshot.definition.steps.find((candidate) =>
    candidate.fields.some((field) => field.id === fieldId),
  );
  const field = step?.fields.find((candidate) => candidate.id === fieldId);

  if (!step || !field) return undefined;

  const siblingKeys = step.fields.filter((other) => other.id !== fieldId).map((other) => other.key);
  const issues = snapshot.issues.filter((issue) => issue.nodeId === fieldId && issue.schemaPath);

  const build = (
    schema: SchemaNode,
    path: SchemaPath,
    role: SchemaEditorNode['role'],
    name?: string,
  ): SchemaEditorNode => {
    const children: SchemaEditorNode[] = [];

    if (schema.kind === 'object') {
      schema.properties.forEach((property) =>
        children.push(build(property.schema, [...path, property.key], 'property', property.key)),
      );
    } else if (schema.kind === 'array') {
      children.push(build(schema.item, [...path, ITEM_SEGMENT], 'item'));
    } else if (schema.kind === 'record') {
      children.push(build(schema.value, [...path, VALUE_SEGMENT], 'value'));
    } else if (schema.kind === 'union') {
      schema.options.forEach((option, index) =>
        children.push(build(option, [...path, optionSegment(index)], 'option', String(index + 1))),
      );
    }

    return {
      path,
      schema,
      role,
      ...(name !== undefined ? { name } : {}),
      availableChecks: CHECKS_BY_KIND[schema.kind].filter(
        (check) => check !== 'equalsField' || (role === 'root' && siblingKeys.length > 0),
      ),
      siblingKeys,
      issues: issues.filter((issue) => JSON.stringify(issue.schemaPath) === JSON.stringify(path)),
      children,
    };
  };

  return { field, kinds: SCHEMA_KINDS, root: build(field.schema, [], 'root') };
}

/** A starting check of a given name, with sensible default values. */
export function createCheck(check: SchemaCheckName, node: SchemaNode, siblingKeys: readonly string[] = []): SchemaCheck {
  switch (check) {
    case 'minLength':
    case 'maxLength':
    case 'length':
      return { check, value: 1 };
    case 'min':
    case 'max':
      return { check, value: node.kind === 'date' ? new Date().toISOString().slice(0, 10) : 0 };
    case 'pattern':
      return { check, value: '^.*$' };
    case 'equalsField':
      return { check, field: siblingKeys[0] ?? '' };
    default:
      return { check };
  }
}

/** Schema edits for one field, as one undo step each. */
export interface SchemaEditorActions {
  setKind(path: SchemaPath, kind: SchemaKind): void;
  update(path: SchemaPath, patch: Partial<SchemaNode>): void;
  addCheck(path: SchemaPath, check: SchemaCheckName): void;
  updateCheck(path: SchemaPath, index: number, check: SchemaCheck): void;
  removeCheck(path: SchemaPath, index: number): void;
  /** Adds a property to an object node. Returns its key. */
  addProperty(path: SchemaPath, key?: string, kind?: SchemaKind): string;
  renameProperty(path: SchemaPath, from: string, to: string): void;
  removeProperty(path: SchemaPath, key: string): void;
  addOption(path: SchemaPath, kind?: SchemaKind): void;
  removeOption(path: SchemaPath, index: number): void;
}

export function createSchemaEditorActions(builder: FormBuilder, fieldId: string): SchemaEditorActions {
  const edit = (path: SchemaPath, update: (node: SchemaNode) => SchemaNode) =>
    builder.fields.updateSchema(fieldId, path, update);
  const withChecks = (node: SchemaNode, checks: SchemaCheck[]) => {
    const { checks: _checks, ...rest } = node;
    return (checks.length > 0 ? { ...rest, checks } : rest) as SchemaNode;
  };
  const siblingKeys = () => {
    const step = builder.getFieldStep(fieldId);
    return step?.fields.filter((field) => field.id !== fieldId).map((field) => field.key) ?? [];
  };

  return {
    setKind: (path, kind) => edit(path, (node) => (node.kind === kind ? node : createSchemaNode(kind, node))),
    update: (path, patch) =>
      edit(path, (node) => {
        const next = { ...node, ...patch } as Record<string, unknown>;

        for (const [key, value] of Object.entries(patch)) {
          if (value === undefined) delete next[key];
        }

        return next as unknown as SchemaNode;
      }),
    addCheck: (path, check) =>
      edit(path, (node) => withChecks(node, [...(node.checks ?? []), createCheck(check, node, siblingKeys())])),
    updateCheck: (path, index, check) =>
      edit(path, (node) => withChecks(node, (node.checks ?? []).map((current, i) => (i === index ? check : current)))),
    removeCheck: (path, index) =>
      edit(path, (node) => withChecks(node, (node.checks ?? []).filter((_, i) => i !== index))),
    addProperty(path, key, kind = 'string') {
      let added = key ?? 'property';

      edit(path, (node) => {
        if (node.kind !== 'object') return node;

        const taken = new Set(node.properties.map((property) => property.key));
        let candidate = added;
        let index = 2;

        while (taken.has(candidate)) candidate = `${added}${index++}`;

        added = candidate;

        return { ...node, properties: [...node.properties, { key: candidate, schema: createSchemaNode(kind) }] };
      });

      return added;
    },
    renameProperty: (path, from, to) =>
      edit(path, (node) =>
        node.kind === 'object' && from !== to
          ? {
              ...node,
              properties: node.properties.map((property) => (property.key === from ? { ...property, key: to } : property)),
            }
          : node,
      ),
    removeProperty: (path, key) =>
      edit(path, (node) =>
        node.kind === 'object'
          ? { ...node, properties: node.properties.filter((property) => property.key !== key) }
          : node,
      ),
    addOption: (path, kind = 'string') =>
      edit(path, (node) => (node.kind === 'union' ? { ...node, options: [...node.options, createSchemaNode(kind)] } : node)),
    removeOption: (path, index) =>
      edit(path, (node) =>
        node.kind === 'union' ? { ...node, options: node.options.filter((_, i) => i !== index) } : node,
      ),
  };
}
