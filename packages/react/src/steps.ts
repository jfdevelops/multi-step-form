import type {
  _instantiateSteps,
  BaseStepFunctions,
  Expand,
  getDeepFields,
  getDefaultValues,
  HelperFn,
  HelperFnChosenSteps,
  HelperFnInput,
  OverrideStatus,
  ResetFn,
  StepNumbers,
  UpdateFn,
} from '@jfdevelops/multi-step-form-core';
import { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import type { ReactNode } from 'react';
import { field } from './field';
import { MultiStepFormSchemaConfig } from './form-config';
import { UseSelector } from './hooks/use-selector';
import { selector } from './selector';
import {
  CreateComponent,
  type CreateComponentConfig,
  CreatedMultiStepFormComponent,
} from './utils';

export namespace StepSpecificComponent {
  type enabledFormSteps<
    def extends StepSchema.Config,
    steps extends instantiateReactSteps<def>,
  > = MultiStepFormSchemaConfig.instantiateFormConfig<def> extends {
    enabledForSteps: infer enabled;
  }
    ? enabled extends HelperFnChosenSteps.main<steps, StepNumbers<steps>>
      ? HelperFnChosenSteps.resolve<steps, enabled>
      : never
    : never;

  export type formComponent<
    def extends StepSchema.Config,
    steps extends instantiateReactSteps<def>,
    chosenSteps extends HelperFnChosenSteps.main<steps, StepNumbers<steps>>,
  > = Extract<
    HelperFnChosenSteps.resolve<steps, chosenSteps>,
    enabledFormSteps<def, steps>
  > extends never
    ? {}
    : MultiStepFormSchemaConfig.instantiateFormConfig<def>;

  type selectedDefaultValues<
    value extends instantiateReactSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
  > = {
    [step in HelperFnChosenSteps.resolve<
      value,
      chosenSteps
    >]: Expand<getDefaultValues<value, step>>;
  };

  type keysOfUnion<value> = value extends value ? keyof value : never;
  type valueForKey<value, key extends PropertyKey> = value extends value
    ? key extends keyof value
      ? value[key]
      : never
    : never;
  type stepsContainingField<
    grouped,
    field extends PropertyKey,
  > = {
    [step in keyof grouped]: field extends keyof grouped[step] ? step : never;
  }[keyof grouped];
  type isUnion<value, original = value> = value extends original
    ? [original] extends [value]
      ? false
      : true
    : never;
  type groupedFieldValues<
    grouped,
    field extends PropertyKey,
  > = Expand<{
    [step in stepsContainingField<grouped, field>]: field extends keyof grouped[step]
      ? grouped[step][field]
      : never;
  }>;
  type flatFieldValue<grouped, field extends PropertyKey> = isUnion<
    stepsContainingField<grouped, field>
  > extends true
    ? groupedFieldValues<grouped, field>
    : valueForKey<grouped[keyof grouped], field>;

  export type multiStepDefaultValues<
    value extends instantiateReactSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    grouped extends selectedDefaultValues<value, chosenSteps> = selectedDefaultValues<
      value,
      chosenSteps
    >,
  > = {
    /** Default field values grouped under their selected step keys. */
    grouped: Expand<grouped>;
    /**
     * Default field values from every selected step merged into one object.
     * A field name declared by multiple selected steps is grouped under those step keys so no
     * value is overwritten.
     */
    flat: Expand<{
      [field in keysOfUnion<grouped[keyof grouped]>]: flatFieldValue<
        grouped,
        field
      >;
    }>;
  };

  export type multiStepFieldName<
    value extends instantiateReactSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
  > = {
    [step in HelperFnChosenSteps.resolve<
      value,
      chosenSteps
    >]: `${step}.${getDeepFields<value, step>}`;
  }[HelperFnChosenSteps.resolve<value, chosenSteps>];

  type stepFromFieldName<name extends string> = name extends `${infer step}.${string}`
    ? step
    : never;
  type fieldFromFieldName<name extends string> = name extends `${string}.${infer field}`
    ? field
    : never;
  type multiStepFieldChildrenProps<
    value extends instantiateReactSteps,
    name extends string,
    selected,
    step extends StepNumbers<value> = Extract<
      stepFromFieldName<name>,
      StepNumbers<value>
    >,
    targetField extends getDeepFields<value, step> = Extract<
      fieldFromFieldName<name>,
      getDeepFields<value, step>
    >,
  > = Expand<
    Omit<
      [selected] extends [never]
        ? field.childrenProps<value, targetField, step>
        : field.childrenPropsWithSelected<
            value,
            step,
            targetField,
            selected
          >,
      'name'
    > & { name: name }
  >;
  type selectedFieldStep<
    value extends instantiateReactSteps,
    step extends StepNumbers<value>,
  > = Expand<{ [key in step]: value[key] }>;
  type selectedFieldStepKey<
    value extends instantiateReactSteps,
    step extends StepNumbers<value>,
  > = StepNumbers<selectedFieldStep<value, step>>;
  type multiStepFieldProps<
    value extends instantiateReactSteps,
    name extends string,
    selected,
    step extends StepNumbers<value> = Extract<
      stepFromFieldName<name>,
      StepNumbers<value>
    >,
    targetField extends getDeepFields<value, step> = Extract<
      fieldFromFieldName<name>,
      getDeepFields<value, step>
    >,
  > = Expand<
    Omit<
      field.boundProps<
        selectedFieldStep<value, step>,
        selectedFieldStepKey<value, step>,
        Extract<
          targetField,
          getDeepFields<
            selectedFieldStep<value, step>,
            selectedFieldStepKey<value, step>
          >
        >,
        selected
      >,
      'name' | 'children'
    > & {
      name: name;
      children: (
        props: multiStepFieldChildrenProps<value, name, selected>,
      ) => ReactNode;
    }
  >;
  export type multiStepFieldComponent<
    value extends instantiateReactSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
  > = <
    name extends multiStepFieldName<value, chosenSteps>,
    selected = never,
  >(
    props: multiStepFieldProps<value, name, selected>,
  ) => ReactNode;

  export type multiStepInput<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
  > = Expand<
    HelperFnInput.BaseInput<value, chosenSteps, never, {}> &
      formComponent<def, value, chosenSteps> & {
        /**
         * Renders a field from any selected step. Names include the owning step, such as
         * `step1.firstName`, so fields with the same name remain unambiguous.
         */
        Field: multiStepFieldComponent<value, chosenSteps>;
        /** Reactively selects a value from the selected steps' context. */
        useSelector: UseSelector<HelperFn.buildCtx<value, chosenSteps>>;
        /** Reactively renders a selected value without rerendering the parent component. */
        Selector: selector.component<HelperFn.buildCtx<value, chosenSteps>>;
        /** Default values for the selected steps in grouped and flattened forms. */
        defaultValues: multiStepDefaultValues<value, chosenSteps>;
      }
  >;
  export type updateWrappers<
    value extends instantiateReactSteps,
    targetStep extends StepNumbers<value>,
  > = {
    /**
     * A useful wrapper around `update` to update the specific field.
     */
    onInputChange: UpdateFn.stepSpecific<value, targetStep>;
    /**
     * A useful wrapper for `update` to reset a specific field's value to its
     * original config value.
     * @resetFn
     */
    reset: ResetFn.stepSpecific<value, targetStep>;
  };
  export type buildCurrentStep<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
  > = Expand<{
    [key in targetStep]: HelperFnChosenSteps.currentStep<value, [key]>;
  }>;
  export type useStepResult<
    value extends instantiateReactSteps,
    targetStep extends StepNumbers<value>,
    TError = Error,
  > = {
    data: HelperFnChosenSteps.currentStep<value, [targetStep]>;
    status: OverrideStatus;
    error: TError | undefined;
  };
  export type useStepOptions<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    error extends Error = Error,
    selected = useStepResult<value, targetStep, error>,
  > = {
    error?: error;
    selector?: (ctx: useStepResult<value, targetStep, error>) => selected;
  };
  export type useStep<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
  > = <
    error extends Error = Error,
    selected = useStepResult<value, targetStep, error>,
  >(
    options?: useStepOptions<def, value, targetStep, error, selected>,
  ) => selected;

  export type suspendProps = {
    children: ReactNode;
    fallback: ReactNode;
  };
  export type suspendComponent<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    _targetStep extends StepNumbers<value>,
  > = (props: suspendProps) => ReactNode;

  export type input<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    additionalCtx extends Record<string, unknown>,
  > = HelperFnInput.BaseInput<value, [targetStep], never, additionalCtx> &
    updateWrappers<value, targetStep> & {
      Field: field.component<buildCurrentStep<def, value, targetStep>>;
      /**
       * A hook for reactively selecting a value from the form context.
       * The selector function receives the contextual data for the currently rendered step, and returns any derived value.
       * `useSelector` will automatically provide the latest context data on updates, and will subscribe the caller for automatic re-renders when the underlying data changes.
       *
       * @param selector - A function that receives the current step's context and returns the selected value
       * @returns The derived value, which will re-render the component on change
       *
       * @example
       * const someValue = useSelector(ctx => ctx.fields.username.value);
       */
      useSelector: UseSelector<buildCurrentStep<def, value, targetStep>>;
      /**
       * A component for reactively displaying a value from the form context.
       * Unlike `useSelector`, this component only re-renders itself, not the parent component.
       * Use this when you want to display a reactive value without causing parent re-renders.
       *
       * @param selector - A function that receives the current step's context and returns the selected value
       * @param children - Optional render prop that receives the selected value
       *
       * @example
       * <Selector selector={(ctx) => ctx.step1.fields.firstName.defaultValue}>
       *   {(value) => <p>First name: {value}</p>}
       * </Selector>
       */
      Selector: selector.component<buildCurrentStep<def, value, targetStep>>;
      /**
       * Reactively resolves the current step overrides and exposes its state.
       *
       * Calling `useStep()` subscribes to the complete `{ data, status, error }`
       * result. Pass a selector in the options when the component only needs a
       * small part of the step state; the component then rerenders only when
       * that selected result changes. Object and array selections use
       * structural equality.
       *
       * Event handlers that only need a value when invoked should prefer a
       * non-reactive snapshot or getter when one is available.
       *
       * @example
       * const firstName = useStep({
       *   selector: ({ data }) => data.fields.firstName.defaultValue,
       * });
       *
       * const contactDetails = useStep({
       *   selector: ({ data }) => ({
       *     email: data.fields.email.defaultValue,
       *     phoneNumber: data.fields.phoneNumber.defaultValue,
       *   }),
       * });
       */
      useStep: useStep<def, value, targetStep>;
      /**
       * Suspends the current step until async overrides have been resolved.
       */
      Suspend: suspendComponent<def, value, targetStep>;
      /**
       * An object containing the default values for every field in the current step,
       * as defined in the schema config.
       */
      defaultValues: Expand<getDefaultValues<value, targetStep>>;
    };

  export type callback<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    props,
    additionalCtx extends Record<string, unknown> = {},
  > = CreateComponent<
    Expand<
      input<def, value, targetStep, additionalCtx> &
        formComponent<def, value, [targetStep]> &
        additionalCtx
    >,
    props
  >;
  export type options<
    value extends instantiateReactSteps,
    targetStep extends StepNumbers<value>,
    additionalCtx extends Record<string, unknown> = {},
  > = HelperFn.CtxDataSelector<value, [targetStep], additionalCtx> & {
    /**
     * If set to `true`, you'll be able to open the {@linkcode console} to view logs.
     */
    debug?: boolean;
  };

  export type config<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    props,
    additionalCtx extends Record<string, unknown> = {},
  > = options<value, targetStep, additionalCtx> &
    CreateComponentConfig<
      Expand<
        input<def, value, targetStep, additionalCtx> &
          formComponent<def, value, [targetStep]> &
          additionalCtx
      >,
      props
    >;

  export type fieldInput<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
  > = targetField extends getDeepFields<value, targetStep>
    ? field.childrenProps<value, targetField, targetStep> & {
        /** Present when the returned component receives a `selectorFn`. */
        selected?: { value: unknown };
      }
    : never;

  export type fieldComponentProps<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
  > = Expand<
    // `forField` owns these two props so callers cannot replace its field binding or renderer.
    Omit<
      field.boundProps<value, targetStep, targetField, unknown>,
      'name' | 'children'
    > &
      Omit<customProps, 'name' | 'children'>
  >;

  export type fieldComponent<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
  > = (
    props: fieldComponentProps<
      def,
      value,
      targetStep,
      targetField,
      customProps
    >,
  ) => ReactNode;

  export type selectableFieldComponentProps<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
  > = Expand<
    fieldComponentProps<
      def,
      value,
      targetStep,
      targetField,
      customProps
    > & {
      /** Selects which field in the component's step is rendered. */
      field: targetField;
    }
  >;

  export type selectableFieldComponent<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
  > = (
    props: selectableFieldComponentProps<
      def,
      value,
      targetStep,
      targetField,
      customProps
    >,
  ) => ReactNode;

  export type fieldConfig<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
  > = {
    field: targetField;
    render: CreateComponent<
      fieldInput<def, value, targetStep, targetField>,
      customProps
    >;
  };

  export type selectableFieldConfig<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object,
  > = {
    render: CreateComponent<
      fieldInput<def, value, targetStep, targetField>,
      customProps
    >;
  };

  export type instanceInput<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
  > = chosenSteps extends [infer targetStep extends StepNumbers<value>]
    ? Expand<
        input<def, value, targetStep, {}> &
          formComponent<def, value, [targetStep]>
      >
    : multiStepInput<def, value, chosenSteps>;
}

type IsLegacyFormAvailable<
  value extends instantiateReactSteps,
  chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>,
  enabledFor extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
> = enabledFor extends MultiStepFormSchemaConfig.defaultEnabledFor
  ? true
  : enabledFor extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>
    ? chosenSteps[number] extends enabledFor[number]
      ? true
      : false
    : enabledFor extends HelperFnChosenSteps.objectNotation<StepNumbers<value>>
      ? chosenSteps[number] extends keyof enabledFor
        ? true
        : false
      : false;

type LegacyFormComponent<
  value extends instantiateReactSteps,
  chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>,
  alias extends string,
  formProps,
  enabledFor extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
> = string extends alias
  ? {}
  : IsLegacyFormAvailable<value, chosenSteps, enabledFor> extends true
    ? MultiStepFormSchemaConfig.formCtx<alias, formProps>
    : {};

export interface StepSpecificCreateComponentFn<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>,
  targetStep extends StepNumbers<value>,
> {
  /**
   * A utility function to easily create a component for the current step.
   * @param config Specific options and the render callback for the component.
   * @returns The created component.
   */
  <additionalCtx extends Record<string, unknown> = {}, props = undefined>(
    config: StepSpecificComponent.config<
      def,
      value,
      targetStep,
      props,
      additionalCtx
    >,
  ): CreatedMultiStepFormComponent<props>;

  /** Creates a reusable component bound to one field in this step. */
  forField<
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object = {},
  >(
    config: StepSpecificComponent.fieldConfig<
      def,
      value,
      targetStep,
      targetField,
      customProps
    >,
  ): StepSpecificComponent.fieldComponent<
    def,
    value,
    targetStep,
    targetField,
    customProps
  >;

  /** Creates a reusable component that selects one of this step's fields when rendered. */
  forField<customProps extends object = {}>(
    config: StepSpecificComponent.selectableFieldConfig<
      def,
      value,
      targetStep,
      getDeepFields<value, targetStep>,
      customProps
    >,
  ): StepSpecificComponent.selectableFieldComponent<
    def,
    value,
    targetStep,
    getDeepFields<value, targetStep>,
    customProps
  >;
}

/**
 * The callback type for step-specific `createComponent` functions.
 * Type parameters after `chosenSteps` are retained for backwards compatibility
 * but are not used in the type resolution.
 */
export type CreateStepSpecificComponentCallback<
  value extends instantiateReactSteps,
  _steps = unknown,
  chosenSteps extends [StepNumbers<value>] = [StepNumbers<value>],
  _formInstance = undefined,
  _formAlias extends string = string,
  props = undefined,
  _enabledFor extends HelperFnChosenSteps.main<value, StepNumbers<value>> =
    MultiStepFormSchemaConfig.defaultEnabledFor,
  _extra = unknown,
  additionalCtx extends Record<string, unknown> = {},
> = CreateComponent<
  Expand<
    HelperFnInput.BaseInput<value, chosenSteps, never, additionalCtx> &
      StepSpecificComponent.updateWrappers<value, chosenSteps[0]> &
      LegacyFormComponent<value, chosenSteps, _formAlias, props, _enabledFor> &
      additionalCtx
  >,
  props
>;

// Not sure this is the best way to do this, but it works for now.
// Tried with module augmentation, but it didn't work due to the generics.
// Because of this, there are a lot of `@ts-expect-error`s in the code.
export type instantiateReactSteps<
  def = unknown,
  value extends Record<PropertyKey, unknown> = _instantiateSteps<def>,
> = Expand<{
  [key in keyof value]: Expand<
    BaseStepFunctions<def, value & _instantiateSteps<def>, key> & {
      // @ts-expect-error -
      createComponent: StepSpecificCreateComponentFn<def, value, key>;
    }
  >;
}>;

/** Concrete step keys declared by the schema, excluding any widened step index. */
export type schemaStepNumbers<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>,
> = Extract<keyof def['steps'], StepNumbers<value>>;
