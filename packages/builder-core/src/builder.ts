import {
  createEmptyDefinition,
  createId,
  getValueTypeFromFieldType,
  toKey,
  uniqueKey,
  type FieldDefinition,
  type FieldSchemaSpec,
  type FormDefinition,
  type JsonValue,
  type StepDefinition,
  type StepValidation,
  type ValidatorLibrary,
} from './definition.js';
import { FormBuilderError } from './errors.js';
import { validateDefinition, type DefinitionIssue } from './issues.js';
import {
  createRegistry,
  resolveDefaultValue,
  structuredCloneJson,
  type FormRegistry,
} from './registry.js';
import type { BuilderStorage } from './storage.js';
import { inferFieldSpec } from './validation.js';

// ---------------------------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------------------------

export type BuilderSelection =
  | { type: 'none' }
  | { type: 'step'; stepId: string }
  | {
      type: 'fields';
      stepId: string;
      /** Selected field ids, in the order they appear in the step. */
      fieldIds: readonly string[];
      /** The field range selection extends from. */
      anchorId: string;
    };

export interface BuilderStatus {
  /** Whether there are edits since the last load or save. */
  dirty: boolean;
  saving: boolean;
  lastSavedAt?: number;
  /** The error from the last failed save. */
  error?: unknown;
}

export interface BuilderSnapshot {
  definition: FormDefinition;
  registry: FormRegistry;
  /** The step shown on the canvas. */
  activeStepId: string | null;
  selection: BuilderSelection;
  issues: readonly DefinitionIssue[];
  history: { canUndo: boolean; canRedo: boolean };
  status: BuilderStatus;
  clipboard: { fieldCount: number };
}

/** Where a field drag started. */
export type DragSource =
  | { kind: 'palette'; fieldType: string }
  | { kind: 'field'; fieldId: string };

/** Where a drag would land: a position in a step's field list. */
export interface DropTarget {
  stepId: string;
  /** The index the (first) dropped field ends up at, after moved fields are taken out. */
  index: number;
}

export interface DropContext {
  source: DragSource;
  target: DropTarget;
  definition: FormDefinition;
  registry: FormRegistry;
}

export interface FormBuilderOptions {
  registry?: FormRegistry;
  /** The definition to start with. Defaults to an empty form with one step. */
  initial?: FormDefinition;
  idGenerator?: (kind: 'form' | 'step' | 'field') => string;
  history?: {
    /** Maximum undo steps. @default 100 */
    limit?: number;
    /** Edits to the same property within this window merge into one undo step. @default 500 */
    mergeWindowMs?: number;
  };
  /** Extra drop rules. Return a string to block a drop and explain why. */
  canDrop?: (context: DropContext) => true | string;
  storage?: BuilderStorage;
  /** Saves automatically after edits. Requires `storage`. */
  autosave?: boolean | { debounceMs?: number };
  /** Called after every definition change. */
  onChange?: (definition: FormDefinition) => void;
  /** The clock, for tests. @default Date.now */
  now?: () => number;
}

export type SelectMode = 'replace' | 'toggle' | 'range';

export type StepInput = Partial<Omit<StepDefinition, 'id' | 'fields'>> & {
  fields?: readonly (Partial<Omit<FieldDefinition, 'id'>> & { type: string })[];
};

export type StepPatch = Partial<Pick<StepDefinition, 'title' | 'description'>>;
export type FieldPatch = Partial<Omit<FieldDefinition, 'id'>>;

export interface FormBuilder {
  readonly registry: FormRegistry;
  getSnapshot(): BuilderSnapshot;
  subscribe(listener: () => void): () => void;

  getStep(stepId: string): StepDefinition | undefined;
  getField(fieldId: string): FieldDefinition | undefined;
  /** The step a field belongs to. */
  getFieldStep(fieldId: string): StepDefinition | undefined;

  readonly steps: {
    add(input?: StepInput, index?: number): string;
    update(stepId: string, patch: StepPatch): void;
    remove(stepId: string): void;
    move(stepId: string, index: number): void;
    duplicate(stepId: string): string;
    setActive(stepId: string): void;
  };

  readonly fields: {
    /** Adds a field of a registered type. Defaults to the end of the active step. */
    add(
      type: string,
      target?: Partial<DropTarget>,
      overrides?: FieldPatch,
    ): string;
    update(fieldId: string, patch: FieldPatch): void;
    /** Sets one property by dot path, e.g. `props.options`. `undefined` removes it. */
    setProperty(fieldId: string, path: string, value: unknown): void;
    remove(fieldIds: string | readonly string[]): void;
    move(fieldIds: string | readonly string[], target: DropTarget): void;
    duplicate(fieldIds: string | readonly string[]): string[];
  };

  readonly validation: {
    set(stepId: string, validation: StepValidation | undefined): void;
    /** Switches a step to schema validation with `library`, keeping existing rules. */
    useLibrary(stepId: string, library: ValidatorLibrary): void;
    /** Overrides one field's rules. `undefined` returns it to its inferred rules. */
    setFieldRules(stepId: string, fieldKey: string, rules: FieldSchemaSpec | undefined): void;
    /** The rules a field currently uses: explicit ones, else inferred ones. */
    getFieldRules(stepId: string, fieldKey: string): FieldSchemaSpec | undefined;
  };

  /** Selects a step or field. `null` clears the selection. */
  select(id: string | null, mode?: SelectMode): void;

  readonly history: {
    undo(): void;
    redo(): void;
    /** Runs `fn` as one undo step, notifying subscribers once. */
    transaction<T>(fn: () => T): T;
    clear(): void;
  };

  readonly clipboard: {
    /** Copies fields. Defaults to the selected fields. */
    copy(fieldIds?: readonly string[]): void;
    cut(fieldIds?: readonly string[]): void;
    /** Pastes after the selection, or at the end of the active step. Returns the new ids. */
    paste(target?: Partial<DropTarget>): string[];
  };

  canDrop(source: DragSource, target: DropTarget): true | string;
  /** Applies a drop: adds a field from the palette or moves fields. Returns affected field ids. */
  drop(source: DragSource, target: DropTarget): string[];

  /** Replaces the whole definition and clears history. */
  load(definition: FormDefinition): void;
  /** Loads a definition from storage. */
  loadFromStorage(formId: string): Promise<boolean>;
  save(): Promise<void>;
  toJSON(): FormDefinition;
  destroy(): void;
}

// ---------------------------------------------------------------------------------------------
// Immutable helpers
// ---------------------------------------------------------------------------------------------

interface FieldLocation {
  step: StepDefinition;
  stepIndex: number;
  field: FieldDefinition;
  index: number;
}

function locateField(definition: FormDefinition, fieldId: string): FieldLocation | undefined {
  for (let stepIndex = 0; stepIndex < definition.steps.length; stepIndex++) {
    const step = definition.steps[stepIndex]!;
    const index = step.fields.findIndex((field) => field.id === fieldId);

    if (index !== -1) {
      return { step, stepIndex, field: step.fields[index]!, index };
    }
  }

  return undefined;
}

function replaceStep(
  definition: FormDefinition,
  stepId: string,
  update: (step: StepDefinition) => StepDefinition,
): FormDefinition {
  return {
    ...definition,
    steps: definition.steps.map((step) => (step.id === stepId ? update(step) : step)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function insertAt<T>(items: readonly T[], index: number, inserted: readonly T[]) {
  const position = clamp(index, 0, items.length);

  return [...items.slice(0, position), ...inserted, ...items.slice(position)];
}

function setIn(target: Record<string, unknown>, path: readonly string[], value: unknown) {
  const [head, ...rest] = path;
  const copy = { ...target };

  if (rest.length === 0) {
    if (value === undefined) delete copy[head!];
    else copy[head!] = value;

    return copy;
  }

  const child = copy[head!];
  copy[head!] = setIn(
    child && typeof child === 'object' && !Array.isArray(child)
      ? (child as Record<string, unknown>)
      : {},
    rest,
    value,
  );

  return copy;
}

/** Renames rule entries and `equalsField` references from `from` to `to` inside one step. */
function renameFieldReferences(step: StepDefinition, from: string, to: string): StepDefinition {
  if (step.validation?.kind !== 'schema' || from === to) {
    return step;
  }

  const fields: Record<string, FieldSchemaSpec> = {};

  for (const [key, spec] of Object.entries(step.validation.fields)) {
    fields[key === from ? to : key] = spec.checks
      ? {
          ...spec,
          checks: spec.checks.map((check) =>
            check.check === 'equalsField' && check.field === from
              ? { ...check, field: to }
              : check,
          ),
        }
      : spec;
  }

  return { ...step, validation: { ...step.validation, fields } };
}

function withoutFieldRules(step: StepDefinition, keys: readonly string[]): StepDefinition {
  if (step.validation?.kind !== 'schema' || keys.length === 0) {
    return step;
  }

  const fields = { ...step.validation.fields };
  keys.forEach((key) => delete fields[key]);

  return { ...step, validation: { ...step.validation, fields } };
}

function withFieldRules(
  step: StepDefinition,
  rules: Record<string, FieldSchemaSpec>,
): StepDefinition {
  if (step.validation?.kind !== 'schema' || Object.keys(rules).length === 0) {
    return step;
  }

  return {
    ...step,
    validation: {
      ...step.validation,
      fields: { ...step.validation.fields, ...rules },
    },
  };
}

function getFieldRules(step: StepDefinition, key: string) {
  return step.validation?.kind === 'schema' ? step.validation.fields[key] : undefined;
}

const toIds = (ids: string | readonly string[]) => (typeof ids === 'string' ? [ids] : [...ids]);

// ---------------------------------------------------------------------------------------------
// createFormBuilder
// ---------------------------------------------------------------------------------------------

interface HistoryEntry {
  definition: FormDefinition;
  activeStepId: string | null;
  selection: BuilderSelection;
  mergeKey?: string;
  time: number;
}

/**
 * Creates a headless form builder: a store holding the definition being edited, plus the
 * commands a builder UI calls. It has no DOM or framework dependency.
 */
export function createFormBuilder(options: FormBuilderOptions = {}): FormBuilder {
  const registry = options.registry ?? createRegistry();
  const newId = options.idGenerator ?? createId;
  const now = options.now ?? Date.now;
  const historyLimit = options.history?.limit ?? 100;
  const mergeWindowMs = options.history?.mergeWindowMs ?? 500;
  const autosaveDelay =
    typeof options.autosave === 'object' ? (options.autosave.debounceMs ?? 1000) : 1000;
  const listeners = new Set<() => void>();

  let definition = options.initial ?? createEmptyDefinition({ id: newId('form') });
  let activeStepId: string | null = definition.steps[0]?.id ?? null;
  let selection: BuilderSelection = { type: 'none' };
  let past: HistoryEntry[] = [];
  let future: HistoryEntry[] = [];
  let savedDefinition = definition;
  let status: Omit<BuilderStatus, 'dirty'> = { saving: false };
  let clipboard: FieldDefinition[] = [];
  let transactionDepth = 0;
  let transactionEntry: HistoryEntry | null = null;
  let pendingNotify = false;
  let pendingChange = false;
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  let issuesFor: FormDefinition | null = null;
  let issues: readonly DefinitionIssue[] = [];
  let snapshot: BuilderSnapshot | null = null;
  let destroyed = false;

  // --- store ------------------------------------------------------------------------------

  function getIssues() {
    if (issuesFor !== definition) {
      issues = Object.freeze(validateDefinition(definition, registry));
      issuesFor = definition;
    }

    return issues;
  }

  function getSnapshot(): BuilderSnapshot {
    snapshot ??= {
      definition,
      registry,
      activeStepId,
      selection,
      issues: getIssues(),
      history: { canUndo: past.length > 0, canRedo: future.length > 0 },
      status: { ...status, dirty: definition !== savedDefinition },
      clipboard: { fieldCount: clipboard.length },
    };

    return snapshot;
  }

  function notify(definitionChanged: boolean) {
    snapshot = null;
    pendingChange ||= definitionChanged;

    if (transactionDepth > 0) {
      pendingNotify = true;
      return;
    }

    pendingNotify = false;

    if (pendingChange) {
      pendingChange = false;
      options.onChange?.(definition);
      scheduleAutosave();
    }

    for (const listener of [...listeners]) listener();
  }

  function entry(mergeKey?: string): HistoryEntry {
    return { definition, activeStepId, selection, mergeKey, time: now() };
  }

  /** Applies an edit to the definition and records it in history. */
  function commit(
    next: FormDefinition,
    ui: { activeStepId?: string | null; selection?: BuilderSelection; mergeKey?: string } = {},
  ) {
    if (next === definition) return;

    if (transactionDepth > 0) {
      transactionEntry ??= entry();
    } else {
      const last = past[past.length - 1];
      const merge =
        ui.mergeKey !== undefined &&
        last?.mergeKey === ui.mergeKey &&
        future.length === 0 &&
        now() - last.time <= mergeWindowMs;

      if (merge) {
        last.time = now();
      } else {
        past = [...past, entry(ui.mergeKey)].slice(-historyLimit);
      }

      future = [];
    }

    definition = next;
    if (ui.activeStepId !== undefined) activeStepId = ui.activeStepId;
    if (ui.selection !== undefined) selection = ui.selection;
    notify(true);
  }

  function setUi(ui: { activeStepId?: string | null; selection?: BuilderSelection }) {
    if (ui.activeStepId !== undefined) activeStepId = ui.activeStepId;
    if (ui.selection !== undefined) selection = ui.selection;
    notify(false);
  }

  function fail(operation: string, reason: string, target?: unknown): never {
    throw new FormBuilderError({ operation, reason, target });
  }

  function requireStep(stepId: string, operation: string) {
    return (
      definition.steps.find((step) => step.id === stepId) ??
      fail(operation, `No step with id "${stepId}"`, stepId)
    );
  }

  function requireField(fieldId: string, operation: string) {
    return locateField(definition, fieldId) ?? fail(operation, `No field with id "${fieldId}"`, fieldId);
  }

  function resolveTarget(target: Partial<DropTarget> = {}, operation: string): DropTarget {
    const stepId =
      target.stepId ?? activeStepId ?? fail(operation, 'There is no step to add fields to');
    const step = requireStep(stepId, operation);

    return { stepId, index: target.index ?? step.fields.length };
  }

  /** Normalizes ids to existing fields, ordered as they appear in the form. */
  function orderedFields(ids: readonly string[], operation: string) {
    return ids
      .map((id) => requireField(id, operation))
      .sort((a, b) => a.stepIndex - b.stepIndex || a.index - b.index);
  }

  function pruneSelection(next: FormDefinition): BuilderSelection {
    const current = selection;

    if (current.type === 'step') {
      return next.steps.some((step) => step.id === current.stepId) ? current : { type: 'none' };
    }

    if (selection.type === 'fields') {
      const remaining = selection.fieldIds.filter((id) => locateField(next, id));

      if (remaining.length === 0) return { type: 'none' };

      return {
        ...selection,
        fieldIds: remaining,
        anchorId: remaining.includes(selection.anchorId) ? selection.anchorId : remaining[0]!,
      };
    }

    return selection;
  }

  function fieldsSelection(stepId: string, fieldIds: readonly string[]): BuilderSelection {
    return fieldIds.length === 0
      ? { type: 'none' }
      : { type: 'fields', stepId, fieldIds, anchorId: fieldIds[0]! };
  }

  // --- field creation ---------------------------------------------------------------------

  function createField(
    type: string,
    step: StepDefinition,
    overrides: FieldPatch = {},
    takenKeys: Iterable<string> = step.fields.map((field) => field.key),
  ): FieldDefinition {
    const fieldType = registry.requireFieldType(type, 'fields.add');
    const label = overrides.label ?? fieldType.defaults?.label ?? fieldType.label;
    const keyBase = overrides.key ?? toKey(typeof label === 'string' ? label : fieldType.label);
    const field: FieldDefinition = {
      id: newId('field'),
      key: uniqueKey(keyBase, takenKeys),
      type,
      defaultValue:
        overrides.defaultValue !== undefined
          ? structuredCloneJson(overrides.defaultValue)
          : resolveDefaultValue(fieldType),
    };

    const defaults = { ...fieldType.defaults, ...overrides };

    if (label !== undefined) field.label = label;
    if (defaults.placeholder !== undefined) field.placeholder = defaults.placeholder;
    if (defaults.description !== undefined) field.description = defaults.description;
    if (defaults.isRequired !== undefined) field.isRequired = defaults.isRequired;
    if (defaults.errorMessage !== undefined) field.errorMessage = defaults.errorMessage;
    if (defaults.props !== undefined) field.props = structuredCloneJson(defaults.props);

    return field;
  }

  /** Copies fields with new ids and keys that don't collide with `taken`. */
  function cloneFields(fields: readonly FieldDefinition[], taken: Set<string>) {
    return fields.map((field) => {
      const key = uniqueKey(field.key, taken);
      taken.add(key);

      const copy = structuredCloneJson(field as unknown as JsonValue) as unknown as FieldDefinition;

      return { ...copy, id: newId('field'), key };
    });
  }

  // --- steps ------------------------------------------------------------------------------

  const steps: FormBuilder['steps'] = {
    add(input = {}, index = definition.steps.length) {
      const number = definition.steps.length + 1;
      const step: StepDefinition = {
        id: newId('step'),
        title: input.title ?? `Step ${number}`,
        fields: [],
      };

      if (input.description !== undefined) step.description = input.description;
      if (input.validation !== undefined) step.validation = input.validation;

      const keys: string[] = [];
      step.fields = (input.fields ?? []).map(({ type, ...overrides }) => {
        const field = createField(type, step, overrides, keys);
        keys.push(field.key);

        return field;
      });

      commit(
        { ...definition, steps: insertAt(definition.steps, index, [step]) },
        { activeStepId: step.id, selection: { type: 'step', stepId: step.id } },
      );

      return step.id;
    },

    update(stepId, patch) {
      requireStep(stepId, 'steps.update');
      commit(
        replaceStep(definition, stepId, (step) => ({ ...step, ...patch })),
        { mergeKey: `step:${stepId}:${Object.keys(patch).sort().join(',')}` },
      );
    },

    remove(stepId) {
      const index = definition.steps.findIndex((step) => step.id === stepId);

      if (index === -1) fail('steps.remove', `No step with id "${stepId}"`, stepId);

      const next = { ...definition, steps: definition.steps.filter((step) => step.id !== stepId) };
      const neighbor = next.steps[Math.min(index, next.steps.length - 1)];
      const nextSelection =
        selection.type !== 'none' && selection.stepId === stepId ? { type: 'none' as const } : selection;

      commit(next, {
        activeStepId: activeStepId === stepId ? (neighbor?.id ?? null) : activeStepId,
        selection: nextSelection,
      });
    },

    move(stepId, index) {
      const step = requireStep(stepId, 'steps.move');
      const rest = definition.steps.filter((candidate) => candidate.id !== stepId);

      commit({ ...definition, steps: insertAt(rest, index, [step]) });
    },

    duplicate(stepId) {
      const original = requireStep(stepId, 'steps.duplicate');
      const index = definition.steps.indexOf(original);
      const copy: StepDefinition = {
        ...(structuredCloneJson(original as unknown as JsonValue) as unknown as StepDefinition),
        id: newId('step'),
        title: `${original.title} (copy)`,
      };
      copy.fields = copy.fields.map((field) => ({ ...field, id: newId('field') }));

      commit(
        { ...definition, steps: insertAt(definition.steps, index + 1, [copy]) },
        { activeStepId: copy.id, selection: { type: 'step', stepId: copy.id } },
      );

      return copy.id;
    },

    setActive(stepId) {
      requireStep(stepId, 'steps.setActive');

      if (stepId !== activeStepId) {
        setUi({ activeStepId: stepId, selection: { type: 'none' } });
      }
    },
  };

  // --- fields -----------------------------------------------------------------------------

  function updateField(fieldId: string, patch: FieldPatch, operation: string, mergeKey?: string) {
    const location = requireField(fieldId, operation);
    const { field, step } = location;
    let nextField: FieldDefinition = { ...field, ...patch };
    let nextStep = step;

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete (nextField as unknown as Record<string, unknown>)[key];
    }

    if (patch.type !== undefined && patch.type !== field.type) {
      const fieldType = registry.requireFieldType(patch.type, operation);

      if (fieldType.valueType !== getValueTypeFromFieldType(field.type)) {
        // The old value and rules no longer fit the new value type.
        nextField = {
          ...nextField,
          defaultValue: patch.defaultValue ?? resolveDefaultValue(fieldType),
        };
        nextStep = withoutFieldRules(nextStep, [field.key]);
      }

      if (patch.props === undefined && fieldType.defaults?.props) {
        nextField.props = structuredCloneJson(fieldType.defaults.props);
      }
    }

    if (patch.key !== undefined && patch.key !== field.key) {
      nextStep = renameFieldReferences(nextStep, field.key, patch.key);
    }

    nextStep = {
      ...nextStep,
      fields: nextStep.fields.map((candidate) => (candidate.id === fieldId ? nextField : candidate)),
    };

    commit(replaceStep(definition, step.id, () => nextStep), { mergeKey });
  }

  function moveFields(ids: readonly string[], target: DropTarget, operation: string) {
    const moving = orderedFields(ids, operation);
    const targetStep = requireStep(target.stepId, operation);
    const movingIds = new Set(moving.map((location) => location.field.id));
    const rulesBySource = new Map<string, string[]>();
    const transferredRules: Record<string, FieldSchemaSpec> = {};
    const taken = new Set(
      targetStep.fields.filter((field) => !movingIds.has(field.id)).map((field) => field.key),
    );

    const moved = moving.map(({ field, step }) => {
      if (step.id === targetStep.id) return field;

      // Moving across steps: keys must be unique in the target, and rules travel along.
      const key = uniqueKey(field.key, taken);
      taken.add(key);
      const rules = getFieldRules(step, field.key);

      if (rules) transferredRules[key] = rules;

      rulesBySource.set(step.id, [...(rulesBySource.get(step.id) ?? []), field.key]);

      return key === field.key ? field : { ...field, key };
    });

    const next: FormDefinition = {
      ...definition,
      steps: definition.steps.map((step) => {
        let nextStep = withoutFieldRules(step, rulesBySource.get(step.id) ?? []);
        const remaining = nextStep.fields.filter((field) => !movingIds.has(field.id));

        if (step.id === targetStep.id) {
          nextStep = withFieldRules(nextStep, transferredRules);

          return { ...nextStep, fields: insertAt(remaining, target.index, moved) };
        }

        return remaining.length === step.fields.length ? nextStep : { ...nextStep, fields: remaining };
      }),
    };

    const changed = JSON.stringify(next) !== JSON.stringify(definition);

    if (!changed) return;

    commit(next, {
      activeStepId: targetStep.id,
      selection: fieldsSelection(targetStep.id, moved.map((field) => field.id)),
    });
  }

  function insertFields(fields: readonly FieldDefinition[], target: DropTarget, rules: Record<string, FieldSchemaSpec> = {}) {
    commit(
      replaceStep(definition, target.stepId, (step) => ({
        ...withFieldRules(step, rules),
        fields: insertAt(step.fields, target.index, fields),
      })),
      {
        activeStepId: target.stepId,
        selection: fieldsSelection(target.stepId, fields.map((field) => field.id)),
      },
    );
  }

  const fields: FormBuilder['fields'] = {
    add(type, target, overrides) {
      const resolved = resolveTarget(target, 'fields.add');
      const step = requireStep(resolved.stepId, 'fields.add');
      const field = createField(type, step, overrides);

      insertFields([field], resolved);

      return field.id;
    },

    update(fieldId, patch) {
      updateField(
        fieldId,
        patch,
        'fields.update',
        `field:${fieldId}:${Object.keys(patch).sort().join(',')}`,
      );
    },

    setProperty(fieldId, path, value) {
      const [head, ...rest] = path.split('.');

      if (!head) fail('fields.setProperty', 'The property path is empty', path);

      const { field } = requireField(fieldId, 'fields.setProperty');
      const patch =
        rest.length === 0
          ? { [head]: value }
          : { [head]: setIn(((field as unknown as Record<string, unknown>)[head] ?? {}) as Record<string, unknown>, rest, value) };

      updateField(fieldId, patch as FieldPatch, 'fields.setProperty', `field:${fieldId}:${path}`);
    },

    remove(fieldIds) {
      const removing = orderedFields(toIds(fieldIds), 'fields.remove');

      if (removing.length === 0) return;

      const ids = new Set(removing.map((location) => location.field.id));
      const keysByStep = new Map<string, string[]>();
      removing.forEach(({ step, field }) =>
        keysByStep.set(step.id, [...(keysByStep.get(step.id) ?? []), field.key]),
      );

      // Restore focus to the field after the last removed one, like a list would.
      const last = removing[removing.length - 1]!;
      const following = last.step.fields.slice(last.index + 1).find((field) => !ids.has(field.id));
      const preceding = last.step.fields
        .slice(0, removing[0]!.index)
        .reverse()
        .find((field) => !ids.has(field.id));
      const focus = following ?? preceding;

      commit(
        {
          ...definition,
          steps: definition.steps.map((step) =>
            keysByStep.has(step.id)
              ? {
                  ...withoutFieldRules(step, keysByStep.get(step.id)!),
                  fields: step.fields.filter((field) => !ids.has(field.id)),
                }
              : step,
          ),
        },
        { selection: focus ? fieldsSelection(last.step.id, [focus.id]) : { type: 'none' } },
      );
    },

    move(fieldIds, target) {
      moveFields(toIds(fieldIds), target, 'fields.move');
    },

    duplicate(fieldIds) {
      const originals = orderedFields(toIds(fieldIds), 'fields.duplicate');

      if (originals.length === 0) return [];

      const last = originals[originals.length - 1]!;
      const step = last.step;
      const taken = new Set(step.fields.map((field) => field.key));
      const copies = cloneFields(originals.map((location) => location.field), taken);
      const rules: Record<string, FieldSchemaSpec> = {};

      originals.forEach(({ step: source, field }, index) => {
        const spec = getFieldRules(source, field.key);

        if (spec) rules[copies[index]!.key] = spec;
      });

      insertFields(copies, { stepId: step.id, index: last.index + 1 }, rules);

      return copies.map((field) => field.id);
    },
  };

  // --- validation -------------------------------------------------------------------------

  const validation: FormBuilder['validation'] = {
    set(stepId, value) {
      requireStep(stepId, 'validation.set');
      commit(
        replaceStep(definition, stepId, (step) => {
          const next = { ...step };

          if (value === undefined) delete next.validation;
          else next.validation = value;

          return next;
        }),
      );
    },

    useLibrary(stepId, library) {
      const step = requireStep(stepId, 'validation.useLibrary');

      if (!registry.getValidator(library)) {
        fail('validation.useLibrary', `No validator adapter is registered for "${library}"`, library);
      }

      const fieldsRules = step.validation?.kind === 'schema' ? step.validation.fields : {};
      validation.set(stepId, { kind: 'schema', library, fields: fieldsRules });
    },

    setFieldRules(stepId, fieldKey, rules) {
      const step = requireStep(stepId, 'validation.setFieldRules');

      if (step.validation?.kind !== 'schema') {
        fail(
          'validation.setFieldRules',
          `Step "${step.title}" does not use schema validation. Call validation.useLibrary() first.`,
          stepId,
        );
      }

      const nextFields = { ...step.validation.fields };

      if (rules === undefined) delete nextFields[fieldKey];
      else nextFields[fieldKey] = rules;

      commit(
        replaceStep(definition, stepId, (current) => ({
          ...current,
          validation: { ...(current.validation as Extract<StepValidation, { kind: 'schema' }>), fields: nextFields },
        })),
        { mergeKey: `rules:${stepId}:${fieldKey}` },
      );
    },

    getFieldRules(stepId, fieldKey) {
      const step = requireStep(stepId, 'validation.getFieldRules');
      const field = step.fields.find((candidate) => candidate.key === fieldKey);

      if (!field) return undefined;

      return getFieldRules(step, fieldKey) ?? inferFieldSpec(field, registry);
    },
  };

  // --- selection --------------------------------------------------------------------------

  function select(id: string | null, mode: SelectMode = 'replace') {
    if (id === null) {
      setUi({ selection: { type: 'none' } });
      return;
    }

    const step = definition.steps.find((candidate) => candidate.id === id);

    if (step) {
      setUi({ activeStepId: step.id, selection: { type: 'step', stepId: step.id } });
      return;
    }

    const location = requireField(id, 'select');
    const stepId = location.step.id;
    const order = location.step.fields.map((field) => field.id);
    const current =
      selection.type === 'fields' && selection.stepId === stepId ? selection : undefined;

    if (mode === 'toggle' && current) {
      const has = current.fieldIds.includes(id);
      const ids = has ? current.fieldIds.filter((fieldId) => fieldId !== id) : [...current.fieldIds, id];
      const ordered = order.filter((fieldId) => ids.includes(fieldId));

      setUi({
        activeStepId: stepId,
        selection:
          ordered.length === 0
            ? { type: 'none' }
            : { type: 'fields', stepId, fieldIds: ordered, anchorId: has ? (ordered[0] ?? id) : id },
      });
      return;
    }

    if (mode === 'range' && current) {
      const from = order.indexOf(current.anchorId);
      const to = order.indexOf(id);
      const [start, end] = from < to ? [from, to] : [to, from];

      setUi({
        activeStepId: stepId,
        selection: { type: 'fields', stepId, fieldIds: order.slice(start, end + 1), anchorId: current.anchorId },
      });
      return;
    }

    setUi({ activeStepId: stepId, selection: { type: 'fields', stepId, fieldIds: [id], anchorId: id } });
  }

  // --- history ----------------------------------------------------------------------------

  function restore(target: HistoryEntry) {
    // Revisions belong to storage, not history: keep the current one.
    definition = { ...target.definition, revision: definition.revision };
    activeStepId =
      target.activeStepId && definition.steps.some((step) => step.id === target.activeStepId)
        ? target.activeStepId
        : (definition.steps[0]?.id ?? null);
    selection = target.selection;
    selection = pruneSelection(definition);
    notify(true);
  }

  const history: FormBuilder['history'] = {
    undo() {
      const previous = past[past.length - 1];

      if (!previous) return;

      past = past.slice(0, -1);
      future = [entry(), ...future];
      restore(previous);
    },
    redo() {
      const next = future[0];

      if (!next) return;

      future = future.slice(1);
      past = [...past, entry()];
      restore(next);
    },
    transaction(fn) {
      transactionDepth++;

      try {
        return fn();
      } finally {
        transactionDepth--;

        if (transactionDepth === 0) {
          if (transactionEntry) {
            past = [...past, transactionEntry].slice(-historyLimit);
            future = [];
            transactionEntry = null;
          }

          if (pendingNotify) notify(false);
        }
      }
    },
    clear() {
      past = [];
      future = [];
      notify(false);
    },
  };

  // --- clipboard --------------------------------------------------------------------------

  function selectedFieldIds() {
    return selection.type === 'fields' ? [...selection.fieldIds] : [];
  }

  const clipboardApi: FormBuilder['clipboard'] = {
    copy(fieldIds = selectedFieldIds()) {
      clipboard = orderedFields(fieldIds, 'clipboard.copy').map((location) =>
        structuredCloneJson(location.field as unknown as JsonValue) as unknown as FieldDefinition,
      );
      notify(false);
    },
    cut(fieldIds = selectedFieldIds()) {
      history.transaction(() => {
        clipboardApi.copy(fieldIds);
        fields.remove(fieldIds);
      });
    },
    paste(target) {
      if (clipboard.length === 0) return [];

      let resolved: DropTarget;

      if (target?.stepId !== undefined || target?.index !== undefined) {
        resolved = resolveTarget(target, 'clipboard.paste');
      } else if (selection.type === 'fields') {
        const lastId = selection.fieldIds[selection.fieldIds.length - 1]!;
        const location = requireField(lastId, 'clipboard.paste');
        resolved = { stepId: location.step.id, index: location.index + 1 };
      } else {
        resolved = resolveTarget({}, 'clipboard.paste');
      }

      const step = requireStep(resolved.stepId, 'clipboard.paste');
      const copies = cloneFields(clipboard, new Set(step.fields.map((field) => field.key)));
      insertFields(copies, resolved);

      return copies.map((field) => field.id);
    },
  };

  // --- drag and drop ----------------------------------------------------------------------

  /** Fields a drag of `fieldId` moves: the whole selection if the field is part of it. */
  function draggedFieldIds(fieldId: string) {
    return selection.type === 'fields' && selection.fieldIds.includes(fieldId)
      ? [...selection.fieldIds]
      : [fieldId];
  }

  function canDrop(source: DragSource, target: DropTarget): true | string {
    if (!definition.steps.some((step) => step.id === target.stepId)) {
      return 'That step no longer exists';
    }

    if (source.kind === 'palette' && !registry.getFieldType(source.fieldType)) {
      return `Unknown field type "${source.fieldType}"`;
    }

    if (source.kind === 'field' && !locateField(definition, source.fieldId)) {
      return 'That field no longer exists';
    }

    return options.canDrop?.({ source, target, definition, registry }) ?? true;
  }

  function drop(source: DragSource, target: DropTarget): string[] {
    const allowed = canDrop(source, target);

    if (allowed !== true) return [];

    if (source.kind === 'palette') {
      return [fields.add(source.fieldType, target)];
    }

    const ids = draggedFieldIds(source.fieldId);
    moveFields(ids, target, 'drop');

    return ids;
  }

  // --- persistence ------------------------------------------------------------------------

  function scheduleAutosave() {
    if (!options.autosave || !options.storage || destroyed) return;

    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      void save().catch(() => {
        // The error is exposed through `status.error`.
      });
    }, autosaveDelay);
  }

  async function save() {
    const storage = options.storage ?? fail('save', 'No storage was passed to createFormBuilder');
    const saving = definition;

    status = { ...status, saving: true, error: undefined };
    notify(false);

    try {
      const result = await storage.save(saving, { baseRevision: saving.revision });
      const revision = result?.revision ?? saving.revision;

      if (definition === saving) {
        definition = { ...definition, revision };
        savedDefinition = definition;
      } else {
        // Edits arrived while saving: keep them, but adopt the new revision.
        definition = { ...definition, revision };
        savedDefinition = { ...saving, revision };
      }

      status = { saving: false, lastSavedAt: now() };
      notify(false);
    } catch (error) {
      status = { ...status, saving: false, error };
      notify(false);
      throw error;
    }
  }

  function load(next: FormDefinition) {
    definition = next;
    savedDefinition = next;
    activeStepId = next.steps[0]?.id ?? null;
    selection = { type: 'none' };
    past = [];
    future = [];
    status = { saving: false };
    notify(false);
  }

  return {
    registry,
    getSnapshot,
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getStep: (stepId) => definition.steps.find((step) => step.id === stepId),
    getField: (fieldId) => locateField(definition, fieldId)?.field,
    getFieldStep: (fieldId) => locateField(definition, fieldId)?.step,
    steps,
    fields,
    validation,
    select,
    history,
    clipboard: clipboardApi,
    canDrop,
    drop,
    load,
    async loadFromStorage(formId) {
      const storage = options.storage ?? fail('loadFromStorage', 'No storage was passed to createFormBuilder');
      const loaded = await storage.load?.(formId);

      if (loaded) load(loaded);

      return loaded !== undefined;
    },
    save,
    toJSON: () => definition,
    destroy() {
      destroyed = true;
      clearTimeout(autosaveTimer);
      listeners.clear();
    },
  };
}
