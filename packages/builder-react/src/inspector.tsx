import {
  setInspectorValue,
  setStepValidationMode,
  type FieldCheck,
  type FieldSchemaSpec,
  type InspectorModel,
  type InspectorProperty as InspectorPropertyModel,
  type PropertyDescriptor,
  type StepValidationMode,
  type StepValidationModel,
  type ValidatorLibrary,
} from '@jfdevelops/multi-step-form-builder-core';
import { forwardRef, useId } from 'react';
import { useBuilder, useInspector, useStepValidation } from './context.js';
import { dataState, renderElement, useMergedRefs, type HeadlessProps } from './render.js';

export type InspectorProps = HeadlessProps<'div', InspectorModel>;

/**
 * Describes what to edit for the current selection: the active step when no field is selected,
 * one field, or the shared properties of several fields. Renders a `div`; use `children` as a
 * function to map over `sections`.
 */
export const Inspector = forwardRef<HTMLElement, InspectorProps>(function Inspector(props, ref) {
  const model = useInspector();
  const mergedRef = useMergedRefs(ref);

  return renderElement(
    'div',
    { role: 'region', 'aria-label': 'Properties', ...dataState({ target: model.target.type }) },
    props,
    model,
    mergedRef,
  );
});

export interface InspectorPropertyState {
  descriptor: PropertyDescriptor;
  value: unknown;
  mixed: boolean;
  error?: string;
  /** Writes the value to every inspected node as one undo step. */
  setValue: (value: unknown) => void;
  /** Spread onto the input. */
  controlProps: {
    id: string;
    name: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  };
  /** Spread onto the `<label>`. */
  labelProps: { id: string; htmlFor: string };
  /** Spread onto the description element, if you render one. */
  descriptionProps: { id: string };
  /** Spread onto the error element, if you render one. */
  errorProps: { id: string; role: 'alert' };
}

// `property` is also an HTML (RDFa) attribute, so it is omitted from the div props.
export type InspectorPropertyProps = Omit<HeadlessProps<'div', InspectorPropertyState>, 'property'> & {
  property: InspectorPropertyModel;
};

/**
 * One editable property. Provides ids and ARIA wiring for its label, input, description and
 * error, plus `setValue`. Pick the input to render from `descriptor.control`. Renders a `div`.
 */
export const InspectorProperty = forwardRef<HTMLElement, InspectorPropertyProps>(
  function InspectorProperty({ property, ...props }, ref) {
    const builder = useBuilder();
    const id = useId();
    const mergedRef = useMergedRefs(ref);
    const { descriptor, value, mixed, error } = property;
    const ids = {
      control: `${id}-control`,
      label: `${id}-label`,
      description: `${id}-description`,
      error: `${id}-error`,
    };
    const describedBy = [descriptor.description ? ids.description : '', error ? ids.error : '']
      .filter(Boolean)
      .join(' ');

    const state: InspectorPropertyState = {
      descriptor,
      value,
      mixed,
      ...(error ? { error } : {}),
      setValue: (next) => setInspectorValue(builder, descriptor.path, next),
      controlProps: {
        id: ids.control,
        name: descriptor.path,
        'aria-invalid': Boolean(error),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      },
      labelProps: { id: ids.label, htmlFor: ids.control },
      descriptionProps: { id: ids.description },
      errorProps: { id: ids.error, role: 'alert' },
    };

    return renderElement(
      'div',
      {
        role: 'group',
        'aria-labelledby': ids.label,
        ...dataState({ control: descriptor.control, mixed, invalid: Boolean(error) }),
      },
      props,
      state,
      mergedRef,
    );
  },
);

export interface StepValidationState extends StepValidationModel {
  /** Switches between no validation, required-only and a schema library. */
  setMode: (mode: Exclude<StepValidationMode, 'code'>, library?: ValidatorLibrary) => void;
  /** Uses a validator library, keeping existing rules. */
  setLibrary: (library: ValidatorLibrary) => void;
  /** Replaces a field's rules. `undefined` goes back to the inferred rules. */
  setFieldRules: (fieldKey: string, rules: FieldSchemaSpec | undefined) => void;
  addCheck: (fieldKey: string, check: FieldCheck) => void;
  updateCheck: (fieldKey: string, index: number, check: FieldCheck) => void;
  removeCheck: (fieldKey: string, index: number) => void;
}

export type StepValidationProps = HeadlessProps<'div', StepValidationState> & {
  /** Defaults to the active step. */
  stepId?: string;
};

/**
 * The validation settings for a step: none, required-only, or rules compiled by a Standard Schema
 * library of the author's choice. Renders a `div`; renders nothing when there is no step.
 */
export const StepValidation = forwardRef<HTMLElement, StepValidationProps>(
  function StepValidation({ stepId, ...props }, ref) {
    const builder = useBuilder();
    const model = useStepValidation(stepId);
    const mergedRef = useMergedRefs(ref);

    if (!model) return null;

    const rulesFor = (fieldKey: string) =>
      model.fields.find((entry) => entry.field.key === fieldKey)?.rules;
    const ensureSchema = () => {
      if (model.mode !== 'schema') builder.validation.useLibrary(model.stepId, 'builtin');
    };
    const editChecks = (fieldKey: string, edit: (checks: FieldCheck[]) => FieldCheck[]) => {
      const rules = rulesFor(fieldKey);

      if (!rules) return;

      builder.history.transaction(() => {
        ensureSchema();
        builder.validation.setFieldRules(model.stepId, fieldKey, {
          ...rules,
          checks: edit([...(rules.checks ?? [])]),
        });
      });
    };

    const state: StepValidationState = {
      ...model,
      setMode: (mode, library) => setStepValidationMode(builder, model.stepId, mode, library),
      setLibrary: (library) => builder.validation.useLibrary(model.stepId, library),
      setFieldRules: (fieldKey, rules) =>
        builder.history.transaction(() => {
          ensureSchema();
          builder.validation.setFieldRules(model.stepId, fieldKey, rules);
        }),
      addCheck: (fieldKey, check) => editChecks(fieldKey, (checks) => [...checks, check]),
      updateCheck: (fieldKey, index, check) =>
        editChecks(fieldKey, (checks) => checks.map((current, i) => (i === index ? check : current))),
      removeCheck: (fieldKey, index) =>
        editChecks(fieldKey, (checks) => checks.filter((_, i) => i !== index)),
    };

    return renderElement(
      'div',
      { role: 'group', 'aria-label': 'Validation', ...dataState({ mode: model.mode }) },
      props,
      state,
      mergedRef,
    );
  },
);
