import {
  type AnyStepField,
  type CasingType,
  type Constrain,
  createCtx,
  type CreateHelperFunctionOptionsBase,
  createStep,
  type DefaultCasing,
  type DefaultStorageKey,
  type Expand,
  type GetCurrentStep,
  type GetFieldsForStep,
  type HelperFnChosenSteps,
  type HelperFnCtx,
  type HelperFnInputBase,
  invariant,
  MultiStepFormLogger,
  type MultiStepFormSchemaStepConfig as MultiStepFormSchemaStepBaseConfig,
  MultiStepFormStepSchema as MultiStepFormStepSchemaBase,
  type Relaxed,
  type ResolvedStep as ResolvedCoreStep,
  type Step,
  type StepNumbers,
  type StrippedResolvedStep,
  type UpdateFn,
  type Updater,
  type ValidStepKey,
} from '@jfdevelops/multi-step-form';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { createField, type Field } from './field';
import { MultiStepFormSchemaConfig } from './form-config';

export interface MultiStepFormSchemaStepConfig<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TStorageKey extends string,
  TFormAlias extends string,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
  TFormProps extends object,
  TResolvedStep extends ResolvedStep<TStep, TCasing> = ResolvedStep<
    TStep,
    TCasing
  >
> extends MultiStepFormSchemaStepBaseConfig<TStep, TCasing, TStorageKey>,
    MultiStepFormSchemaConfig.Form<
      TResolvedStep,
      TFormAlias,
      TFormEnabledFor,
      TFormProps
    > {}

export type CreateFunction<TArgs extends any[], TReturn = void> = (
  ...args: TArgs
) => TReturn;
export type CreateComponent<TInput, TProps> = CreateFunction<
  [input: TInput, props: TProps],
  ReactNode
>;

export type CreateComponentCallback<
  TResolvedStep extends StrippedResolvedStep<AnyResolvedStep>,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TProps
> = CreateComponent<
  HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps>,
  TProps
>;
export type CreatedMultiStepFormComponent<TProps> = TProps extends undefined
  ? () => ReactNode
  : (props: TProps) => ReactNode;
export type CreateComponentFn<
  TResolvedStep extends AnyResolvedStep,
  // This is needed to make TS happy with all types
  TStepNumbers extends StepNumbers<TResolvedStep>
> = <
  chosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  props = undefined
>(
  options: CreateHelperFunctionOptionsBase<
    TResolvedStep,
    TStepNumbers,
    chosenSteps
  >,
  fn: CreateComponentCallback<TResolvedStep, TStepNumbers, chosenSteps, props>
) => CreatedMultiStepFormComponent<props>;

export namespace StepSpecificComponent {
  // The logic for getting the formCtx only works for step specific `createComponent`
  // (i.e: step1.createComponent(...)) as of now. Reason is because I can't think of a good API for integrating the form
  // ctx into the main `createComponent` since multiple steps can be chosen. In that case
  // how would the logic work for when the form component should be defined in the callback?
  // Ideas:
  //  - Make the main `createComponent` return a function that accepts the current step
  export type formComponent<
    TResolvedStep extends StrippedResolvedStep<AnyResolvedStep>,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TFormAlias extends string,
    TFormProps extends object,
    TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>
  > = TFormEnabledFor extends MultiStepFormSchemaConfig.defaultEnabledFor
    ? MultiStepFormSchemaConfig.formCtx<TFormAlias, TFormProps>
    : TFormEnabledFor extends HelperFnChosenSteps.tupleNotation<
        ValidStepKey<TSteps>
      >
    ? TFormEnabledFor[number] extends keyof TResolvedStep
      ? TChosenSteps extends HelperFnChosenSteps.tupleNotation<
          ValidStepKey<TSteps>
        >
        ? TChosenSteps[number] extends keyof TResolvedStep
          ? TChosenSteps[number] extends TFormEnabledFor[number]
            ? MultiStepFormSchemaConfig.formCtx<TFormAlias, TFormProps>
            : {}
          : {}
        : {}
      : {}
    : keyof TFormEnabledFor extends keyof TResolvedStep
    ? TChosenSteps extends HelperFnChosenSteps.tupleNotation<
        ValidStepKey<TSteps>
      >
      ? TChosenSteps[number] extends keyof TResolvedStep
        ? TChosenSteps[number] extends keyof TFormEnabledFor
          ? MultiStepFormSchemaConfig.formCtx<TFormAlias, TFormProps>
          : {}
        : {}
      : {}
    : {};
  export type onInputChange<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends TStepNumbers
  > = <
    CurrentStepData extends GetCurrentStep<TResolvedStep, TTargetStep>,
    Field extends keyof CurrentStepData
  >(
    field: Field,
    updater: Updater<CurrentStepData[Field], Relaxed<CurrentStepData[Field]>>
  ) => void;
  export interface Input<
    TResolvedStep extends StrippedResolvedStep<AnyResolvedStep>,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TAdditionalCtx extends Record<string, unknown>,
    TStepNumber extends HelperFnChosenSteps.extractStepNumber<
      TResolvedStep,
      TSteps,
      TChosenSteps
    > = HelperFnChosenSteps.extractStepNumber<
      TResolvedStep,
      TSteps,
      TChosenSteps
    >
  > extends HelperFnInputBase<
      TResolvedStep,
      TSteps,
      TChosenSteps,
      never,
      TAdditionalCtx
    > {
    /**
     * A useful wrapper around `update` to update the specific field.
     */
    onInputChange: TStepNumber extends TSteps
      ? UpdateFn.stepSpecific<TResolvedStep, TSteps, ValidStepKey<TStepNumber>>
      : never;
    // onInputChange: <
    //   CurrentStepData extends GetCurrentStep<
    //     TResolvedStep,
    //     // @ts-ignore Type checking works properly, type doesn't match
    //     HelperFnChosenSteps.extractStepNumber<
    //       TResolvedStep,
    //       TSteps,
    //       TChosenSteps
    //     >
    //   >,
    //   Field extends keyof CurrentStepData
    // >(
    //   field: Field,
    //   updater: Updater<CurrentStepData[Field], Relaxed<CurrentStepData[Field]>>
    // ) => void;
    Field: Field.component<
      TResolvedStep,
      TSteps,
      // @ts-ignore Type checking works properly, type doesn't match
      HelperFnChosenSteps.extractStepNumber<TResolvedStep, TSteps, TChosenSteps>
    >;
  }

  export type callback<
    TResolvedStep extends StrippedResolvedStep<AnyResolvedStep>,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TProps,
    TFormAlias extends string,
    TFormProps extends object,
    TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
    TAdditionalInput extends object,
    TAdditionalCtx extends Record<string, unknown>
  > = CreateComponent<
    Expand<
      Input<TResolvedStep, TSteps, TChosenSteps, TAdditionalCtx> &
        formComponent<
          TResolvedStep,
          TSteps,
          TChosenSteps,
          TFormAlias,
          TFormProps,
          TFormEnabledFor
        > &
        TAdditionalInput
    >,
    TProps
  >;
  export const DEFAULT_FORM_INSTANCE_ALIAS = 'form';
  export type defaultFormInstanceAlias = typeof DEFAULT_FORM_INSTANCE_ALIAS;
  export type formInstanceOptions<
    TAlias extends string,
    TRenderInput,
    TReturn
  > = {
    /**
     * The name of the return value of the `render` method.
     */
    alias?: TAlias;
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
    render: CreateFunction<[input: TRenderInput], TReturn>;
  };
  export type options<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TTargetStep extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TFormInstanceAlias extends string,
    TFormInstance,
    TCtx
  > = {
    /**
     * If set to `true`, you'll be able to open the {@linkcode console} to view logs.
     */
    debug?: boolean;
    useFormInstance?: formInstanceOptions<
      TFormInstanceAlias,
      HelperFnInputBase<TResolvedStep, TSteps, TTargetStep> & {
        /**
         * An object containing all the default values for the current step.
         */
        defaultValues: Expand<
          ExtractedDefaultValues<TResolvedStep, TSteps, TTargetStep>
        >;
      },
      TFormInstance
    >;
    /**
     * A function to select the data that will be available in the `fn`'s ctx.
     * @param input The available input to create the context with.
     * @returns The created ctx.
     */
    ctxData?: (
      input: HelperFnInputBase<
        TResolvedStep,
        TSteps,
        'all',
        HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TTargetStep>
      >
    ) => TCtx;
  };
}

export type CreateStepSpecificComponentCallback<
  TResolvedStep extends StrippedResolvedStep<AnyResolvedStep>,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TProps,
  TFormAlias extends string,
  TFormProps extends object,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
  TAdditionalInput extends object = {},
  TAdditionalCtx extends Record<string, unknown> = {}
> = StepSpecificComponent.callback<
  TResolvedStep,
  TSteps,
  TChosenSteps,
  TProps,
  TFormAlias,
  TFormProps,
  TFormEnabledFor,
  TAdditionalInput,
  TAdditionalCtx
>;

export type ExtractedDefaultValues<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TTargetStep extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TExtractedStepNumber extends number = HelperFnChosenSteps.extractStepNumber<
    TResolvedStep,
    TSteps,
    TTargetStep
  >,
  TFields extends GetFieldsForStep<
    TResolvedStep,
    ValidStepKey<TExtractedStepNumber>
  > = GetFieldsForStep<TResolvedStep, ValidStepKey<TExtractedStepNumber>>
> = { [field in keyof TFields]: TFields[field]['defaultValue'] };
export interface StepSpecificCreateComponentFn<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TTargetStep extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TFormAlias extends string,
  TFormProps extends object,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>
> {
  /**
   * A utility function to easily create a component for the current step.
   * @param fn The callback function where the component is defined.
   */
  <props = undefined>(
    fn: CreateStepSpecificComponentCallback<
      TResolvedStep,
      TSteps,
      TTargetStep,
      props,
      TFormAlias,
      TFormProps,
      TFormEnabledFor
    >
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
      TResolvedStep,
      TSteps,
      TTargetStep,
      formInstanceAlias,
      formInstance,
      additionalCtx
    >,
    fn: CreateStepSpecificComponentCallback<
      TResolvedStep,
      TSteps,
      TTargetStep,
      props,
      TFormAlias,
      TFormProps,
      TFormEnabledFor,
      { [_ in formInstanceAlias]: formInstance },
      additionalCtx
    >
  ): CreatedMultiStepFormComponent<props>;
}

export type ResolvedStep<
  TStep extends Step<TDefaultCasing>,
  TDefaultCasing extends CasingType = DefaultCasing,
  TResolvedStep extends ResolvedCoreStep<
    TStep,
    TDefaultCasing
  > = ResolvedCoreStep<TStep, TDefaultCasing>,
  TFormAlias extends string = MultiStepFormSchemaConfig.defaultFormAlias,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep> = MultiStepFormSchemaConfig.defaultEnabledFor,
  TFormProps extends object = ComponentPropsWithRef<'form'>
> = {
  [stepKey in keyof TResolvedStep]: TResolvedStep[stepKey] &
    (stepKey extends ValidStepKey<StepNumbers<TResolvedStep>>
      ? {
          createComponent: StepSpecificCreateComponentFn<
            TResolvedStep,
            StepNumbers<TResolvedStep>,
            [stepKey],
            TFormAlias,
            TFormProps,
            TFormEnabledFor
          >;
        }
      : {});
};

export type AnyResolvedStep = ResolvedStep<any, any, any>;
export interface HelperFunctions<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> {
  createComponent: CreateComponentFn<TResolvedStep, TStepNumbers>;
}
namespace CreateComponentImplConfig {
  export type stepSpecificConfig<
    TResolvedStep extends AnyResolvedStep,
    TFormAlias extends string,
    TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
    TFormProps extends object
  > = {
    isStepSpecific: true;
    defaultId: string;
    form?: MultiStepFormSchemaConfig.FormConfig<
      TResolvedStep,
      TFormAlias,
      TFormEnabledFor,
      TFormProps
    >;
  };

  export type nonStepSpecific = {
    isStepSpecific: false;
  };

  export type config<
    TResolvedStep extends AnyResolvedStep,
    TFormAlias extends string,
    TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
    TFormProps extends object
  > =
    | nonStepSpecific
    | stepSpecificConfig<
        TResolvedStep,
        TFormAlias,
        TFormEnabledFor,
        TFormProps
      >;
}

/**
 * Creates a default values object for the target step.
 * @param steps The steps schema.
 * @param targetStep The step to create the default values for.
 * @returns An object containing the field names and their default values.
 */
export function createDefaultValues<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends StepNumbers<resolvedStep>,
  targetStep extends ValidStepKey<stepNumbers>
>(steps: resolvedStep, targetStep: targetStep) {
  invariant(
    targetStep in steps,
    `The target step ${targetStep} is not a valid step key`
  );

  const current = steps[targetStep as unknown as keyof resolvedStep];

  invariant('fields' in current, `No "fields" were found for ${targetStep}`);

  let defaultValues = {};

  for (const [fieldName, fieldValues] of Object.entries(
    current.fields as Record<string, Record<string, unknown>>
  )) {
    defaultValues = {
      ...defaultValues,
      [fieldName]: fieldValues.defaultValue,
    };
  }

  return defaultValues as Expand<
    ExtractedDefaultValues<resolvedStep, stepNumbers, [targetStep]>
  >;
}
export class MultiStepFormStepSchema<
    step extends Step<casing>,
    casing extends CasingType = DefaultCasing,
    storageKey extends string = DefaultStorageKey,
    formAlias extends string = MultiStepFormSchemaConfig.defaultFormAlias,
    formEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<resolvedStep> = MultiStepFormSchemaConfig.defaultEnabledFor,
    formProps extends object = ComponentPropsWithRef<'form'>,
    core extends ResolvedCoreStep<step, casing> = ResolvedCoreStep<
      step,
      casing
    >,
    resolvedStep extends ResolvedStep<
      step,
      casing,
      core,
      formAlias,
      formEnabledFor,
      formProps
    > = ResolvedStep<step, casing, core, formAlias, formEnabledFor, formProps>,
    stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>
  >
  extends MultiStepFormStepSchemaBase<step, casing>
  implements HelperFunctions<resolvedStep, stepNumbers>
{
  // @ts-ignore type doesn't match `MultiStepFormSchemaBase.value`
  value: resolvedStep;

  constructor(
    config: MultiStepFormSchemaStepConfig<
      step,
      Constrain<casing, CasingType>,
      storageKey,
      formAlias,
      formEnabledFor,
      formProps
    >
  ) {
    const { form, ...rest } = config;

    super(rest as never);

    this.value = this.enrichValues(createStep(this.original));
    this.value = this.enrichValues(this.value, (step) => {
      const key = `step${step as stepNumbers}`;
      const id = form?.id ?? key;

      return {
        createComponent: this.createComponentForStep(
          [`step${step as stepNumbers}`],
          {
            isStepSpecific: true,
            defaultId: id,
            form: form as never,
          }
        ),
      };
    });
  }

  private createFormComponent(
    form: Omit<
      MultiStepFormSchemaConfig.FormConfig<
        resolvedStep,
        formAlias,
        formEnabledFor,
        formProps
      >,
      'alias'
    >,
    defaultId: string
  ) {
    const { render, enabledForSteps = 'all', id = defaultId } = form;

    const ctx = {
      id,
      steps: createCtx(this.value, enabledForSteps as never),
    };

    return (props: formProps) => render(ctx, props);
  }

  private createStepSpecificComponentImpl<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.stepSpecificConfig<
      resolvedStep,
      formAlias,
      formEnabledFor,
      formProps
    >,
    input: HelperFnInputBase<resolvedStep, stepNumbers, chosenStep>,
    extraInput = {}
  ) {
    return <props>(fn: Function) =>
      ((props: props) => {
        // Call hook functions from extraInput at the top level of the component
        // This ensures hooks are called in a valid React context (before any conditionals)
        const hookResults: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(extraInput)) {
          if (typeof value === 'function') {
            try {
              const result = value();
              // Verify the hook was actually called and returned a value
              // (hooks should always return something, even if it's undefined)
              hookResults[key] = result;

              // In development, we can add additional verification here
              // Log hook calls for debugging (can be disabled in production by removing console.debug)
              if (typeof console !== 'undefined' && console.debug) {
                console.debug(
                  `[multi-step-form] Hook "${key}" called successfully`,
                  { result: result !== undefined ? 'defined' : 'undefined' }
                );
              }
            } catch (error) {
              // Provide helpful error message if hook throws
              const errorMessage =
                error instanceof Error ? error.message : String(error);

              throw new Error(
                `[multi-step-form] Error calling hook "${key}" in useFormInstance.render: ${errorMessage}\n\n` +
                  `This usually means:\n` +
                  `1. The hook is being called outside of a React component\n` +
                  `2. The hook has invalid dependencies or configuration\n` +
                  `3. There's an error in your hook implementation\n\n` +
                  `Original error: ${errorMessage}`,
                { cause: error }
              );
            }
          } else {
            hookResults[key] = value;
          }
        }

        const { defaultId, form } = config;
        const { ctx } = input;

        // Safe cast here since the step specific `createComponent` will always have
        // `stepData` as a tuple
        const [step] =
          stepData as HelperFnChosenSteps.tupleNotation<`step${stepNumbers}`>;

        invariant(
          this.steps.isValidStepKey(step),
          `[createComponent]: the target step ${step} is invalid. Note, this error shouldn't appear as the target step should always be valid. If you see this error, please open an issue.`
        );

        const stepNumber = Number.parseInt(step.replace('step', ''));

        invariant(
          !Number.isNaN(stepNumber),
          `[${step}:"createComponent"]: an error occurred while extracting the number`
        );
        const current = this.value[step as keyof resolvedStep];

        // These checks are mostly for type safety. `current` should _always_ be in the proper format.
        // On the off chance that it's not, we have the checks here to help, but these checks are basically
        // just for type safety.
        invariant(
          'fields' in current,
          `[${step}:createComponent]: unable to find the "fields" for the current step`
        );
        invariant(
          typeof current.fields === 'object',
          `[${step}:createComponent]: the "fields" property must be an object, was ${typeof current.fields}`
        );

        const Field = createField((name) => {
          invariant(typeof name === 'string', () => {
            const formatter = new Intl.ListFormat('en', {
              style: 'long',
              type: 'disjunction',
            });

            return `[${step}:Field]: the "name" prop must be a string and a valid field for ${step}. Available fields include ${formatter.format(
              Object.keys(current.fields as Record<string, unknown>)
            )}`;
          });
          invariant(
            name in (current.fields as object),
            `[${step}:Field]: the field "${name}" doesn't exist for the current step`
          );

          invariant(
            'update' in current,
            `[${step}:Field]: No "update" function was found`
          );

          const { fields, update } = current;
          const { defaultValue, label, nameTransformCasing, type } = (
            fields as AnyStepField
          )[name];

          return {
            defaultValue,
            label,
            nameTransformCasing,
            type,
            name,
            onInputChange: (value: unknown) =>
              // TODO remove type assertions
              (
                update as UpdateFn.stepSpecific<
                  resolvedStep,
                  stepNumbers,
                  ValidStepKey<stepNumbers>
                >
              )({
                fields: [`fields.${name}.defaultValue`] as never,
                updater: value as never,
              }),
          };
        });

        let fnInput = {
          ctx,
          onInputChange: this.createStepUpdaterFn(step),
          Field,
          ...hookResults,
        };

        if (form) {
          const {
            alias = MultiStepFormSchemaConfig.DEFAULT_FORM_ALIAS,
            ...rest
          } = form;
          const enabledFor = rest.enabledForSteps ?? 'all';

          if (
            MultiStepFormSchemaConfig.isFormAvailable(
              stepData as never,
              enabledFor as never
            )
          ) {
            fnInput = {
              ...fnInput,
              [alias]: this.createFormComponent(rest, defaultId),
            };
          }

          return fn(fnInput, props);
        }

        return fn(
          {
            ...fnInput,
            [MultiStepFormSchemaConfig.DEFAULT_FORM_ALIAS]:
              MultiStepFormSchemaConfig.createDefaultForm(defaultId),
          },
          props
        );
      }) as CreatedMultiStepFormComponent<props>;
  }

  private createStepSpecificComponentFactory<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.stepSpecificConfig<
      resolvedStep,
      formAlias,
      formEnabledFor,
      formProps
    >,
    ctx: HelperFnCtx<resolvedStep, stepNumbers, chosenStep>
  ): StepSpecificCreateComponentFn<
    resolvedStep,
    stepNumbers,
    chosenStep,
    formAlias,
    formProps,
    formEnabledFor
  > {
    const createStepSpecificComponentImpl =
      this.createStepSpecificComponentImpl.bind(this);
    const createDefaultValues = this.createDefaultValues.bind(this);
    const resolvedValues = this.value;

    function impl<props = undefined>(
      fn: CreateStepSpecificComponentCallback<
        resolvedStep,
        stepNumbers,
        chosenStep,
        props,
        formAlias,
        formProps,
        formEnabledFor
      >
    ): CreatedMultiStepFormComponent<props>;
    function impl<
      formInstance,
      formInstanceAlias extends string = StepSpecificComponent.defaultFormInstanceAlias,
      props = undefined,
      additionalCtx = {}
    >(
      options: StepSpecificComponent.options<
        resolvedStep,
        stepNumbers,
        chosenStep,
        formInstanceAlias,
        formInstance,
        additionalCtx
      >,
      fn: CreateStepSpecificComponentCallback<
        resolvedStep,
        stepNumbers,
        chosenStep,
        props,
        formAlias,
        formProps,
        formEnabledFor,
        { [_ in formInstanceAlias]: formInstance }
      >
    ): CreatedMultiStepFormComponent<props>;
    function impl<
      formInstance,
      formInstanceAlias extends string = StepSpecificComponent.defaultFormInstanceAlias,
      props = undefined,
      additionalCtx = {}
    >(
      optionsOrFn:
        | StepSpecificComponent.options<
            resolvedStep,
            stepNumbers,
            chosenStep,
            formInstanceAlias,
            formInstance,
            additionalCtx
          >
        | CreateStepSpecificComponentCallback<
            resolvedStep,
            stepNumbers,
            chosenStep,
            props,
            formAlias,
            formProps,
            formEnabledFor
          >,
      fn?: CreateStepSpecificComponentCallback<
        resolvedStep,
        stepNumbers,
        chosenStep,
        props,
        formAlias,
        formProps,
        formEnabledFor,
        { [_ in formInstanceAlias]: formInstance }
      >
    ) {
      function createResolvedCtx(additionalCtx: unknown) {
        return (
          additionalCtx ? { ctx: { ...ctx, ...additionalCtx } } : { ctx }
        ) as HelperFnInputBase<resolvedStep, stepNumbers, chosenStep>;
      }

      function createStepSpecificComponent() {
        invariant(
          typeof optionsOrFn === 'function',
          'The first argument must be a function'
        );

        return createStepSpecificComponentImpl(
          stepData,
          config,
          createResolvedCtx(undefined)
        )(optionsOrFn);
      }

      if (typeof optionsOrFn === 'object') {
        const { useFormInstance, ctxData, debug } = optionsOrFn;
        const currentStepKey = (
          stepData as HelperFnChosenSteps.tupleNotation<
            ValidStepKey<stepNumbers>
          >
        )[0] as keyof resolvedStep;
        const logger = new MultiStepFormLogger({
          debug,
          prefix(prefix) {
            return `${prefix}-${String(currentStepKey)}-createComponent`;
          },
        });

        logger.info('First argument is an object');

        const { [currentStepKey]: _, ...values } = resolvedValues;

        invariant(
          typeof fn === 'function',
          'The second argument must be a function'
        );

        if (useFormInstance) {
          const {
            render,
            alias = StepSpecificComponent.DEFAULT_FORM_INSTANCE_ALIAS,
          } = useFormInstance;

          // Safe cast here since the step specific `createComponent` will always have
          // `stepData` as a tuple
          const [step] =
            stepData as HelperFnChosenSteps.tupleNotation<`step${stepNumbers}`>;

          // Store the render function and inputs to call it at component level
          // This ensures hooks are called in a valid React context
          const defaultValues = createDefaultValues(step) as never;
          const resolvedCtx = ctxData
            ? {
                ...ctx,
                ...ctxData({ ctx: values } as never),
              }
            : ctx;
          const renderInput = { ctx: resolvedCtx, defaultValues };

          return createStepSpecificComponentImpl(
            stepData,
            config,
            resolvedCtx as never,
            {
              [alias]: () => render(renderInput as never),
            }
          )(fn);
        }

        if (ctxData) {
          logger.info('Option "ctxData" is defined');
          invariant(
            typeof ctxData === 'function',
            'Option "ctxData" must be a function'
          );

          const additionalCtx = ctxData({ ctx: values } as never);

          logger.info(
            `Addition context is: ${JSON.stringify(additionalCtx, null, 2)}`
          );

          const resolvedCtx = {
            ...ctx,
            ...additionalCtx,
          };

          logger.info(
            `Resolved context is: ${JSON.stringify(resolvedCtx, null, 2)}`
          );

          return createStepSpecificComponentImpl(stepData, config, {
            ctx: resolvedCtx as never,
          })(fn);
        }

        // Empty options object. Can throw here 🤷‍♂️
        // Maybe add "global" - top level config - option to tune fine grained errors.
        return createStepSpecificComponent();
      }

      return createStepSpecificComponent();
    }

    return impl;
  }

  private createComponentImpl<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.config<
      resolvedStep,
      formAlias,
      formEnabledFor,
      formProps
    >
  ) {
    const ctx = createCtx<resolvedStep, stepNumbers, chosenStep>(
      this.value,
      stepData
    );

    if (config.isStepSpecific) {
      return this.createStepSpecificComponentFactory(stepData, config, ctx);
    }

    return <props>(fn: Function) =>
      ((props?: props) =>
        fn(ctx, props as any)) as CreatedMultiStepFormComponent<props>;
  }

  private createComponentForStep<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.stepSpecificConfig<
      resolvedStep,
      formAlias,
      formEnabledFor,
      formProps
    >
  ) {
    return this.createComponentImpl(stepData, config);
  }

  /**
   * A helper function to create a component for a specific step.
   * @param options The options for creating the step specific component.
   * @param fn A callback that is used for accessing the target step's data and defining
   * any props that the component should have. This function must return a valid `JSX` element.
   * @returns The created component for the step.
   */
  createComponent<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    props = undefined
  >(
    options: CreateHelperFunctionOptionsBase<
      resolvedStep,
      stepNumbers,
      chosenSteps
    >,
    fn: CreateComponentCallback<resolvedStep, stepNumbers, chosenSteps, props>
  ) {
    return (
      this.createComponentImpl(options.stepData, {
        isStepSpecific: false,
      }) as <props>(
        fn: CreateComponentCallback<
          resolvedStep,
          stepNumbers,
          chosenSteps,
          props
        >
      ) => CreatedMultiStepFormComponent<props>
    )<props>(fn);
  }

  createDefaultValues<targetStep extends ValidStepKey<stepNumbers>>(
    targetStep: targetStep
  ) {
    return createDefaultValues(this.value, targetStep);
  }
}
