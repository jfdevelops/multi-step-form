import {
  compileStepValidator,
  createFormFromDefinition,
  createSchemaEditorActions,
  generateCode,
  getFormSettingsModel,
  getSchemaEditorModel,
  getStepKey,
  matchesSchema,
  resolveFieldLabel,
  toJsonValue,
  toRuntimeValue,
  type DefinitionForm,
  type FieldDefinition,
  type FormDefinition,
  type FormRegistry,
  type FormSettings,
  type GenerateCodeOptions,
  type GeneratedCode,
  type JsonValue,
  type StepDefinition,
} from '@jfdevelops/multi-step-form-builder-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useBuilder,
  useBuilderSelector,
  useBuilderSnapshot,
} from './context.js';

// ---------------------------------------------------------------------------------------------
// Form settings
// ---------------------------------------------------------------------------------------------

/** Form-wide settings (casing, default validator library, storage key, instances) and a setter. */
export function useFormSettings() {
  const builder = useBuilder();
  const snapshot = useBuilderSnapshot();
  const model = useMemo(() => getFormSettingsModel(snapshot), [snapshot]);

  return {
    ...model,
    /** Updates settings. `undefined` removes one. */
    update: (patch: Partial<FormSettings>) => builder.settings.update(patch),
  };
}

// ---------------------------------------------------------------------------------------------
// Schema editor
// ---------------------------------------------------------------------------------------------

/**
 * The schema tree of a field and the edits it supports: the generic Standard Schema builder.
 * Defaults to the selected field when exactly one is selected; `undefined` otherwise.
 */
export function useSchemaEditor(fieldId?: string) {
  const builder = useBuilder();
  const snapshot = useBuilderSnapshot();
  const id =
    fieldId ??
    (snapshot.selection.type === 'fields' &&
    snapshot.selection.fieldIds.length === 1
      ? snapshot.selection.fieldIds[0]
      : undefined);
  const model = useMemo(
    () => (id ? getSchemaEditorModel(snapshot, id) : undefined),
    [snapshot, id],
  );
  const actions = useMemo(
    () => (id ? createSchemaEditorActions(builder, id) : undefined),
    [builder, id],
  );

  return model && actions ? { ...model, ...actions } : undefined;
}

// ---------------------------------------------------------------------------------------------
// Generated code
// ---------------------------------------------------------------------------------------------

export type GeneratedCodeState =
  | (GeneratedCode & { error?: undefined })
  | {
      error: Error;
      source?: undefined;
      validatorsSource?: undefined;
      packages: string[];
      steps: [];
      types: [];
    };

/**
 * The form as a TypeScript module, kept up to date with every edit: the full `source`, each step's
 * Standard Schema validator, the exported value types, and the npm `packages` the module imports
 * (for an editor to load their types).
 */
export function useGeneratedCode(
  options: Omit<GenerateCodeOptions, 'registry'> = {},
): GeneratedCodeState {
  const definition = useBuilderSelector((snapshot) => snapshot.definition);
  const registry = useBuilderSelector((snapshot) => snapshot.registry);
  const { importFrom, factoryName, instanceName } = options;

  return useMemo(() => {
    try {
      return generateCode(definition, {
        registry,
        importFrom,
        factoryName,
        instanceName,
      });
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error(String(error)),
        packages: [],
        steps: [],
        types: [],
      };
    }
  }, [definition, registry, importFrom, factoryName, instanceName]);
}

// ---------------------------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------------------------

export interface PreviewField {
  key: string;
  /** The label, resolved like the multi-step form resolves it. */
  label: string | undefined;
  definition: FieldDefinition;
  /** The current value as JSON (dates as ISO strings), ready for the same editors as default values. */
  value: JsonValue;
  /** Sets the value from JSON. */
  setValue(value: JsonValue): void;
  /** Messages from the step's validator for this field (including nested paths). */
  errors: string[];
}

export interface PreviewStep {
  key: `step${number}`;
  index: number;
  definition: StepDefinition;
  title: string;
  description?: string;
  isComplete: boolean;
  /** Whether the user tried to leave this step while it was incomplete. */
  attempted: boolean;
  fields: PreviewField[];
}

export type FormPreviewState =
  | {
      status: 'ready';
      steps: PreviewStep[];
      currentStep: PreviewStep;
      isFirst: boolean;
      isLast: boolean;
      /** Moves on if the current step is complete. Returns whether it moved. */
      next(): boolean;
      previous(): void;
      goTo(index: number): void;
      reset(): void;
    }
  | {
      /** The definition can't run yet, e.g. a step has no fields. */
      status: 'error';
      error: Error;
    };

/** Preview forms never persist or use named instances. */
function previewDefinition(definition: FormDefinition): FormDefinition {
  if (!definition.settings) return definition;

  const {
    storageKey: _storageKey,
    instances: _instances,
    ...settings
  } = definition.settings;

  return { ...definition, settings };
}

function issuesByField(
  validator: ReturnType<typeof compileStepValidator>,
  values: Record<string, unknown>,
) {
  const byField = new Map<string, string[]>();
  const result = validator?.['~standard'].validate(values);

  if (!result || result instanceof Promise) return byField;

  for (const issue of result.issues ?? []) {
    const first = issue.path?.[0];
    const key = String(
      typeof first === 'object' && first !== null ? first.key : first,
    );

    byField.set(key, [...(byField.get(key) ?? []), issue.message]);
  }

  return byField;
}

function createPreview(
  definition: FormDefinition,
  registry: FormRegistry,
  previous?: DefinitionForm,
) {
  const runnable = previewDefinition(definition);
  const form = createFormFromDefinition(runnable, { registry })();

  // Keep what was entered in fields that still exist with a compatible value.
  if (previous) {
    definition.steps.forEach((step, index) => {
      const key = getStepKey(index);
      const before = previous.stepSchema.value[key];
      const after = form.stepSchema.value[key];

      if (!before || !after) return;

      for (const field of step.fields) {
        const value = before.fields[field.key]?.defaultValue;

        if (
          value !== undefined &&
          matchesSchema({ ...field.schema, optional: true }, toJsonValue(value))
        ) {
          after.update({
            fields: [`fields.${field.key}.defaultValue`],
            updater: () => value,
          });
        }
      }
    });
  }

  return {
    form,
    validators: runnable.steps.map((step) =>
      compileStepValidator(step, registry, runnable.settings),
    ),
  };
}

/**
 * Runs the form being built as a real multi-step form, for a live preview. Values entered in the
 * preview survive edits to the builder when the field still fits them. Render each field from
 * `definition` (its `type` and `schema`).
 */
export function useFormPreview(): FormPreviewState {
  const definition = useBuilderSelector((snapshot) => snapshot.definition);
  const registry = useBuilderSelector((snapshot) => snapshot.registry);
  const [resetCount, setResetCount] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [, setVersion] = useState(0);
  // The last form and the reset it belongs to, so edits keep entered values but resets don't.
  const last = useRef<{ form: DefinitionForm; resetCount: number } | null>(
    null,
  );

  const preview = useMemo(() => {
    const previous =
      last.current?.resetCount === resetCount ? last.current.form : undefined;

    try {
      return {
        ok: true as const,
        ...createPreview(definition, registry, previous),
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }, [definition, registry, resetCount]);

  useEffect(() => {
    if (!preview.ok) return;

    last.current = { form: preview.form, resetCount };

    return preview.form.subscribe(() => setVersion((version) => version + 1));
  }, [preview, resetCount]);

  const reset = useCallback(() => {
    setResetCount((count) => count + 1);
    setStepIndex(0);
    setAttempted(new Set());
  }, []);

  if (!preview.ok) return { status: 'error', error: preview.error };

  const { form, validators } = preview;
  const settings = definition.settings;
  const steps = definition.steps.map((step, index): PreviewStep => {
    const key = getStepKey(index);
    const runtime = form.stepSchema.value[key]!;
    const values = Object.fromEntries(
      step.fields.map((field) => [
        field.key,
        runtime.fields[field.key]?.defaultValue,
      ]),
    );
    const errors = issuesByField(validators[index], values);

    return {
      key,
      index,
      definition: step,
      title: runtime.title,
      ...(runtime.description !== undefined
        ? { description: runtime.description }
        : {}),
      isComplete: runtime.isComplete,
      attempted: attempted.has(index),
      fields: step.fields.map((field) => ({
        key: field.key,
        label: resolveFieldLabel(field, step, settings),
        definition: field,
        value: toJsonValue(values[field.key]),
        setValue: (value) =>
          runtime.update({
            fields: [`fields.${field.key}.defaultValue`],
            updater: () => toRuntimeValue(field.schema, value),
          }),
        errors: errors.get(field.key) ?? [],
      })),
    };
  });

  const index = Math.min(stepIndex, steps.length - 1);
  const currentStep = steps[index]!;

  return {
    status: 'ready',
    steps,
    currentStep,
    isFirst: index === 0,
    isLast: index === steps.length - 1,
    next() {
      if (!currentStep.isComplete) {
        setAttempted((current) => new Set(current).add(index));
        return false;
      }

      setStepIndex(Math.min(index + 1, steps.length - 1));
      return true;
    },
    previous: () => setStepIndex(Math.max(index - 1, 0)),
    goTo: (target) =>
      setStepIndex(Math.max(0, Math.min(target, steps.length - 1))),
    reset,
  };
}
