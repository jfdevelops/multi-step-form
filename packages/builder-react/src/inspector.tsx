import {
  setInspectorValue,
  setStepValidationMode,
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
  /** What applies when left empty (the derived label, the inherited casing). Good as a placeholder. */
  hint?: string;
  /** The first inspected step or field, e.g. for a `value` control to read the field's schema. */
  node: InspectorPropertyModel['node'];
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
    const { descriptor, value, mixed, hint, node, error } = property;
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
      node,
      ...(hint !== undefined ? { hint } : {}),
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
  /**
   * Follows the form's library (`inherit`), turns validation off (`none`), or picks a library
   * for this step (`schema`).
   */
  setMode: (mode: Exclude<StepValidationMode, 'code'>, library?: ValidatorLibrary) => void;
  /** Validates this step with `library`. */
  setLibrary: (library: ValidatorLibrary) => void;
}

export type StepValidationProps = HeadlessProps<'div', StepValidationState> & {
  /** Defaults to the active step. */
  stepId?: string;
};

/**
 * How a step is validated: with the form's library, not at all, or with a Standard Schema library
 * picked for this step. Field rules live on each field's schema. Renders a `div`; renders nothing
 * when there is no step.
 */
export const StepValidation = forwardRef<HTMLElement, StepValidationProps>(
  function StepValidation({ stepId, ...props }, ref) {
    const builder = useBuilder();
    const model = useStepValidation(stepId);
    const mergedRef = useMergedRefs(ref);

    if (!model) return null;

    const state: StepValidationState = {
      ...model,
      setMode: (mode, library) => setStepValidationMode(builder, model.stepId, mode, library),
      setLibrary: (library) => setStepValidationMode(builder, model.stepId, 'schema', library),
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
