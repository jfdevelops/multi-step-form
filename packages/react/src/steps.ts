import type {
  _instantiateSteps,
  BaseStepFunctions,
  Expand,
  getDefaultValues,
  HelperFn,
  HelperFnChosenSteps,
  HelperFnInput,
  ResetFn,
  StepNumbers,
  UpdateFn,
} from '@jfdevelops/multi-step-form-core';
import { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import { field } from './field';
import { MultiStepFormSchemaConfig } from './form-config';
import { UseSelector } from './hooks/use-selector';
import { selector } from './selector';
import { CreateComponent, CreatedMultiStepFormComponent } from './utils';

export namespace StepSpecificComponent {
  type instantiateFormComponentForAllSteps<
    def extends StepSchema.Config,
    value = MultiStepFormSchemaConfig.instantiateFormConfig<def>
  > = MultiStepFormSchemaConfig.EnabledForSteps.get<value> extends MultiStepFormSchemaConfig.defaultEnabledFor
    ? MultiStepFormSchemaConfig.instantiateFormConfig<def>
    : {};
  type instantiateFormComponentForTuple<
    def extends StepSchema.Config,
    steps extends instantiateReactSteps,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>
  > = MultiStepFormSchemaConfig.EnabledForSteps.get<def> extends HelperFnChosenSteps.tupleNotation<
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
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>
  > = MultiStepFormSchemaConfig.EnabledForSteps.get<def> extends HelperFnChosenSteps.objectNotation<
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
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>
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
    chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>
  > = instantiateFormComponent<
    def,
    steps,
    chosenSteps
  >[MultiStepFormSchemaConfig.EnabledForSteps.resolveType<def, steps>];
  export type updateWrappers<
    value extends instantiateReactSteps,
    targetStep extends StepNumbers<value>
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
    targetStep extends StepNumbers<value>
  > = Expand<{
    [key in targetStep]: HelperFnChosenSteps.currentStep<value, [key]>;
  }>;

  export type input<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    additionalCtx extends Record<string, unknown>
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
    };

  export type callback<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
    targetStep extends StepNumbers<value>,
    props,
    additionalCtx extends Record<string, unknown> = {}
  > = CreateComponent<
    Expand<
      input<def, value, targetStep, additionalCtx> &
        formComponent<def, value, [targetStep]> &
        additionalCtx
    >,
    props
  >;
  export const DEFAULT_FORM_INSTANCE_ALIAS = 'form';
  export type defaultFormInstanceAlias = typeof DEFAULT_FORM_INSTANCE_ALIAS;
  export type formInstanceOptions<alias extends string, input, ret> = {
    /**
     * The name of the return value of the `render` method.
     */
    alias?: alias;
    /**
     * A function that renders/creates the form instance. This function will be called
     * at the top level of the component, ensuring hooks are called in a valid React context.
     *
     * @param input - The input object containing context and default values
     * @returns The form instance (typically from a hook like `useForm`)
     *
     * @example
     * ```tsx
     * useFormInstance: {
     *   render({ defaultValues }) {
     *     return useForm({
     *       defaultValues,
     *     });
     *   },
     * }
     * ```
     *
     * **Verification**: The hook call is automatically verified:
     * - Errors are caught and reported with helpful messages
     * - In development, hook calls are logged to console.debug
     * - The hook must be called at the component top level (enforced by the framework)
     */
    render: (input: input) => ret;
  };

  export type options<
    value extends instantiateReactSteps,
    targetStep extends StepNumbers<value>,
    formAlias extends string,
    formInstance,
    additionalCtx extends Record<string, unknown> = {}
  > = HelperFn.CtxDataSelector<value, [targetStep], additionalCtx> & {
    /**
     * If set to `true`, you'll be able to open the {@linkcode console} to view logs.
     */
    debug?: boolean;
    useFormInstance?: formInstanceOptions<
      formAlias,
      Pick<HelperFnInput.BaseInput<value, [targetStep]>, 'ctx'> & {
        /**
         * An object containing all the default values for the current step.
         */
        defaultValues: Expand<getDefaultValues<value, targetStep>>;
      },
      formInstance
    >;
  };
}

export interface StepSpecificCreateComponentFn<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>,
  targetStep extends StepNumbers<value>
> {
  /**
   * A utility function to easily create a component for the current step.
   * @param fn The callback function where the component is defined.
   */
  <props = undefined>(
    fn: StepSpecificComponent.callback<def, value, targetStep, props>
  ): CreatedMultiStepFormComponent<props>;
  /**
   * A utility function to easily create a component for the current step.
   * @param options Specific config options for creating a component for the current step.
   * @param fn The callback function where the component is defined.
   * @returns The created component.
   */
  <
    formInstance,
    additionalCtx extends Record<string, unknown> = {},
    formInstanceAlias extends string = StepSpecificComponent.defaultFormInstanceAlias,
    props = undefined
  >(
    options: StepSpecificComponent.options<
      value,
      targetStep,
      MultiStepFormSchemaConfig.inferFormAlias<value>,
      formInstance,
      additionalCtx
    >,
    fn: StepSpecificComponent.callback<
      def,
      value,
      targetStep,
      MultiStepFormSchemaConfig.inferFormProps<value>,
      { [_ in formInstanceAlias]: formInstance }
    >
  ): CreatedMultiStepFormComponent<props>;
}

// Not sure this is the best way to do this, but it works for now.
// Tried with module augmentation, but it didn't work due to the generics.
// Because of this, there are a lot of `@ts-expect-error`s in the code.
export type instantiateReactSteps<
  def = unknown,
  value extends _instantiateSteps<def> = _instantiateSteps<def>
> = Expand<{
  [key in keyof value]: Expand<
    BaseStepFunctions<def, value, key> & {
      // @ts-expect-error -
      createComponent: StepSpecificCreateComponentFn<def, value, key>;
    }
  >;
}>;
