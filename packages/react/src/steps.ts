import type {
  _instantiateSteps,
  BaseStepFunctions,
  Expand,
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
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { field } from './field';
import { MultiStepFormSchemaConfig } from './form-config';
import { UseSelector } from './hooks/use-selector';
import { selector } from './selector';
import { CreateComponent, CreatedMultiStepFormComponent } from './utils';

export namespace StepSpecificComponent {
  type defaultFormComponent = {
    [key in MultiStepFormSchemaConfig.defaultFormAlias]: CreatedMultiStepFormComponent<
      Omit<ComponentPropsWithRef<'form'>, 'id'>
    >;
  };
  type instantiateFormComponentForAllSteps<
    def extends StepSchema.Config,
    value = MultiStepFormSchemaConfig.instantiateFormConfig<def>,
  > =
    MultiStepFormSchemaConfig.EnabledForSteps.get<value> extends MultiStepFormSchemaConfig.defaultEnabledFor
      ? keyof MultiStepFormSchemaConfig.instantiateFormConfig<def> extends never
        ? defaultFormComponent
        : MultiStepFormSchemaConfig.instantiateFormConfig<def>
      : {};
  type instantiateFormComponentForTuple<
    def extends StepSchema.Config,
    steps extends instantiateReactSteps,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>,
  > =
    MultiStepFormSchemaConfig.EnabledForSteps.get<def> extends HelperFnChosenSteps.tupleNotation<
      StepNumbers<steps>
    >
      ? chosenSteps[number] extends StepNumbers<steps>
        ? chosenSteps[number] extends MultiStepFormSchemaConfig.EnabledForSteps.get<def>[number]
          ? MultiStepFormSchemaConfig.instantiateFormConfig<def>
          : {}
        : {}
      : {};

  type instantiateFormComponentForObject<
    def extends StepSchema.Config,
    steps extends instantiateReactSteps,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>,
  > =
    MultiStepFormSchemaConfig.EnabledForSteps.get<def> extends HelperFnChosenSteps.objectNotation<
      StepNumbers<steps>
    >
      ? chosenSteps[number] extends StepNumbers<steps>
        ? chosenSteps[number] extends keyof MultiStepFormSchemaConfig.EnabledForSteps.get<def>
          ? MultiStepFormSchemaConfig.instantiateFormConfig<def>
          : {}
        : {}
      : {};
  type instantiateFormComponent<
    def extends StepSchema.Config,
    steps extends instantiateReactSteps<def>,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>,
  > = {
    all: instantiateFormComponentForAllSteps<def>;
    tuple: instantiateFormComponentForTuple<def, steps, chosenSteps>;
    object: instantiateFormComponentForObject<def, steps, chosenSteps>;
  };
  // The logic for getting the formCtx only works for step specific `createComponent`
  // (i.e: step1.createComponent(...)) as of now. Reason is because I can't think of a good API for integrating the form
  // ctx into the main `createComponent` since multiple steps can be chosen. In that case
  // how would the logic work for when the form component should be defined in the callback?
  // Ideas:
  //  - Make the main `createComponent` return a function that accepts the current step
  export type formComponent<
    def extends StepSchema.Config,
    steps extends instantiateReactSteps<def>,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>,
  > = instantiateFormComponent<
    def,
    steps,
    chosenSteps
  >[MultiStepFormSchemaConfig.EnabledForSteps.resolveType<def, steps>];
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
  type buildCurrentStep<
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
  > = <error extends Error = Error, selected = useStepResult<value, targetStep, error>>(
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
   * @param fn The callback function where the component is defined.
   */
  <props = undefined>(
    fn: StepSpecificComponent.callback<def, value, targetStep, props>,
  ): CreatedMultiStepFormComponent<props>;
  /**
   * A utility function to easily create a component for the current step.
   * @param options Specific config options for creating a component for the current step.
   * @param fn The callback function where the component is defined.
   * @returns The created component.
   */
  <additionalCtx extends Record<string, unknown> = {}, props = undefined>(
    options: StepSpecificComponent.options<value, targetStep, additionalCtx>,
    fn: StepSpecificComponent.callback<
      def,
      value,
      targetStep,
      props,
      additionalCtx
    >,
  ): CreatedMultiStepFormComponent<props>;
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
  value extends _instantiateSteps<def> = _instantiateSteps<def>,
> = Expand<{
  [key in keyof value]: Expand<
    BaseStepFunctions<def, value, key> & {
      // @ts-expect-error -
      createComponent: StepSpecificCreateComponentFn<def, value, key>;
    }
  >;
}>;
