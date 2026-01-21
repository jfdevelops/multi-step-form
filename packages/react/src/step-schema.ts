import {
  buildValuePath,
  createCtx,
  createInvariant,
  type Expand,
  getDefaultValues,
  type HelperFn,
  type HelperFnChosenSteps,
  type HelperFnInput,
  instantiateSteps,
  type Invariant,
  MultiStepFormLogger,
  MultiStepFormStepSchema as MultiStepFormStepSchemaBase,
  type ResetFn,
  type StepNumbers,

  type UpdateFn,
} from '@jfdevelops/multi-step-form-core';
import {
  MultiStepFormStepSchemaInternal,
  path,
  type StepSchema,
} from '@jfdevelops/multi-step-form-core/_internals';
import { field } from './field';
import { MultiStepFormSchemaConfig } from './form-config';
import { createUseSelector, type UseSelector } from './hooks/use-selector';
import { selector } from './selector';
import {
  createComponent,
  type CreateComponent,
  type CreateComponentCallback,
  type CreatedMultiStepFormComponent,
  getValidatedCustomInputHooks,
  resolvedCtxCreator,
} from './utils';

export type CreateComponentFn<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
> = <targetStep extends StepNumbers<value>, props = undefined>(
  options: HelperFn.BaseOptions<value, [targetStep]>,
  fn: CreateComponentCallback<value, [targetStep], props>
) => CreatedMultiStepFormComponent<props>;

export namespace StepSpecificComponent {
  type instantiateFormComponentForAllSteps<
    def extends StepSchema.Config,
    value = MultiStepFormSchemaConfig.instantiateFormConfig<def>,
  > =
    MultiStepFormSchemaConfig.EnabledForSteps.get<value> extends MultiStepFormSchemaConfig.defaultEnabledFor
      ? MultiStepFormSchemaConfig.instantiateFormConfig<def>
      : {};
  type instantiateFormComponentForTuple<
    def extends StepSchema.Config,
    steps extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<
      StepNumbers<steps>
    >,
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
    steps extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<
      StepNumbers<steps>
    >,
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
    steps extends instantiateSteps<def>,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<
      StepNumbers<steps>
    >,
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
    steps extends instantiateSteps<def>,
    chosenSteps extends HelperFnChosenSteps.tupleNotation<
      StepNumbers<steps>
    >,
  > = instantiateFormComponent<
    def,
    steps,
    chosenSteps
  >[MultiStepFormSchemaConfig.EnabledForSteps.resolveType<def, steps>];
  export type updateWrappers<
    value extends instantiateSteps,
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
    value extends instantiateSteps<def>,
    targetStep extends StepNumbers<value>,
  > = Expand<{
    [key in targetStep]: HelperFnChosenSteps.currentStep<value, [key]>;
  }>;

  export type input<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>,
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
    };

  export type callback<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>,
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
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    formAlias extends string,
    formInstance,
    additionalCtx extends Record<string, unknown> = {},
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
  value extends instantiateSteps<def>,
  targetStep extends StepNumbers<value>,
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
    formInstanceAlias extends string =
      StepSpecificComponent.defaultFormInstanceAlias,
    props = undefined,
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

export interface HelperFunctions<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
> {
  createComponent: CreateComponentFn<def, value>;
}
namespace CreateComponentImplConfig {
  export type stepSpecificConfig<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>,
  > = {
    isStepSpecific: true;
    defaultId: string;
    form?: MultiStepFormSchemaConfig.FormConfig<def, value>;
  };

  export type nonStepSpecific = {
    isStepSpecific: false;
  };

  export type config<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>,
  > = nonStepSpecific | stepSpecificConfig<def, value>;
}

export namespace MultiStepFormStepSchema {
  export type config<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>,
  > = def & {
    /**
     * The form configuration.
     *
     * This is a private property and is not meant to be used directly.
     * If you want to configure the form, do so with the {@linkcode instantiateFormConfig} method.
     * @private
     * @internal
     */
    form?: MultiStepFormSchemaConfig.FormConfig<def, value>;
  };
}

declare module '@jfdevelops/multi-step-form-core' {
  namespace steps {
    interface ExtendedStepSpecificFunctions<
      def extends StepSchema.Config,
      value extends instantiateSteps<def>,
      key extends StepNumbers<value>,
    > {
      createComponent: StepSpecificCreateComponentFn<def, value, key>;
    }
  }
}

export class MultiStepFormStepSchema<
  const def extends StepSchema.Config,
  value extends instantiateSteps<def> = instantiateSteps<def>,
>
  extends MultiStepFormStepSchemaBase<def, value>
  implements HelperFunctions<def, value>
{
  value: value;
  readonly #internal: MultiStepFormStepSchemaInternal<def, value>;

  constructor(config: MultiStepFormStepSchema.config<def, value>) {
    const { form, ...rest } = config;

    super(rest as never);

    this.value = instantiateSteps({ steps: this.original });

    this.#internal = new MultiStepFormStepSchemaInternal({
      originalValue: this.original,
      getValue: () => this.value,
      setValue: (next) => this.handlePostUpdate(next),
    });

    this.sync();

    const createFormConfig = MultiStepFormSchemaConfig.instantiateFormConfig(
      this.value,
      this.steps.value
    );
    const instantiatedForm = createFormConfig(form);
    this.value = this.#internal.enrichValues(this.value, (step) => {
      const targetStep = `step${step}` as StepNumbers<value>;

      const id = form?.id ?? targetStep;

      return {
        createComponent: this.createStepSpecificComponentFactory(targetStep, {
          isStepSpecific: true,
          defaultId: id,
          form: instantiatedForm as never,
        }),
      };
    });
  }

  private createFormComponent(
    form: Omit<MultiStepFormSchemaConfig.FormConfig<def, value>, 'alias'>,
    defaultId: string
  ) {
    const { render, enabledForSteps = 'all', id = defaultId } = form;

    const ctx = {
      id,
      steps: createCtx(this.value, enabledForSteps as never),
    };

    return (props: MultiStepFormSchemaConfig.inferFormProps<value>) => {
      const Component = render(ctx as never);
      const invariant: Invariant = createInvariant('[createFormComponent]');

      invariant(
        typeof Component === 'function',
        'The "render" property must be a function'
      );

      const C = Component(props);

      invariant(
        typeof C === 'function',
        'The "render" function must return a valid React component'
      );

      return C;
    };
  }

  private createResolvedCtx<
    // Safe to use tuple notation here since the step specific `createComponent` will always have
    // `stepData` as a tuple
    chosenStep extends HelperFnChosenSteps.tupleNotation<
      StepNumbers<value>
    >,
    additionalCtx extends Record<string, unknown>,
  >(
    options: {
      stepData: chosenStep;
      logger: MultiStepFormLogger;
    } & HelperFn.CtxDataSelector<value, chosenStep, additionalCtx>
  ) {
    const { logger, stepData, ctxData } = options;
    // Create ctx fresh each time to ensure it has the latest this.value
    const ctx = createCtx(this.value, stepData);

    if (ctxData) {
      const [targetStep] = stepData;
      const { [targetStep]: _, ...values } = this.value;
      const createResolvedCtx = resolvedCtxCreator(logger, values as value);

      return createResolvedCtx({ ctx, ctxData } as never);
    }

    return ctx;
  }

  private createStepSpecificComponentImpl<
    // Safe to use tuple notation here since the step specific `createComponent` will always have
    // `stepData` as a tuple
    chosenStep extends HelperFnChosenSteps.tupleNotation<
      StepNumbers<value>
    >,
    additionalCtx extends Record<string, unknown> = {},
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.stepSpecificConfig<def, value>,
    extraConfig?: {
      logger?: MultiStepFormLogger;
      input?: (
        ctx: Expand<HelperFn.buildCtx<value, chosenStep>>
      ) => Record<string, unknown>;
    } & HelperFn.CtxDataSelector<value, chosenStep, additionalCtx>
  ) {
    const [step] = stepData;
    const invariant: Invariant = createInvariant(`[${step}:createComponent]`);
    return <props>(fn: Function) =>
      ((props: props) => {
        const ctxData = extraConfig?.ctxData;
        const logger = extraConfig?.logger ?? new MultiStepFormLogger();
        const resolvedCtx = this.createResolvedCtx({
          stepData,
          ctxData,
          logger,
        });
        const extraInput = extraConfig?.input?.(resolvedCtx as never) ?? {};
        // Call hook functions from extraInput at the top level of the component
        // This ensures hooks are called in a valid React context (before any conditionals)
        const hookResults = getValidatedCustomInputHooks(extraInput);
        const { defaultId, form } = config;

        invariant(
          this.steps.isValidStep(step),
          `The target step ${step} is invalid. Note, this error shouldn't appear as the target step should always be valid. If you see this error, please open an issue.`
        );

        const stepNumber = Number.parseInt(step.replace('step', ''));

        invariant(
          !Number.isNaN(stepNumber),
          `An error occurred while extracting the number`
        );
        const current = this.value[step];

        invariant(
          typeof current === 'object' && current !== null,
          `The current step must be an object, was ${typeof current}`
        );
        // These checks are mostly for type safety. `current` should _always_ be in the proper format.
        // On the off chance that it's not, we have the checks here to help, but these checks are basically
        // just for type safety.
        invariant(
          'fields' in current,
          `Unable to find the "fields" for the current step`
        );
        invariant(
          typeof current.fields === 'object',
          `The "fields" property must be an object, was ${typeof current.fields}`
        );

        // Memoize Field component to prevent remounting on every render
        // This ensures input focus is maintained when ctx changes
        const Field = field.create({
          propsCreator: (name) => {
            // Access current step data directly to avoid stale closure
            const currentStep = this.value[step] as typeof current;
            const currentFields = Object.keys(
              currentStep.fields as Record<string, unknown>
            );
            const invariant: Invariant = createInvariant(`[${step}:Field]`);

            invariant(
              typeof name === 'string',
              (formatter) =>
                `[${step}:Field]: the "name" prop must be a string and a valid field for ${step}. Available fields include: "${formatter.format(
                  currentFields
                )}"`
            );
            // TODO add support for deep keys (`name`)

            const allAvailableFields = path
              .createDeep(currentStep.fields)
              .map((value) => (value as string).replace('.defaultValue.', '.'));

            invariant(
              allAvailableFields.includes(name),
              (formatter) =>
                `[${step}:Field]: the field "${name}" doesn't exist for the current step. Available fields include: "${formatter.format(
                  allAvailableFields
                )}".`
            );

            invariant(
              'update' in currentStep,
              `[${step}:Field]: No "update" function was found`
            );

            const defaultValue = this.getValue(step as never, name);
            const builtValuePath = buildValuePath(name);
            const { label, nameTransformCasing, type } = path.pickBy(
              currentStep.fields,
              builtValuePath
            );

            const targetFields = `fields.${builtValuePath}`;

            return {
              defaultValue,
              label,
              nameTransformCasing,
              type,
              name,
              onInputChange: <
                strict extends boolean = true,
                partial extends boolean = false,
              >(
                value: unknown,
                options?: field.onInputChangeOptions<strict, partial>
              ) => {
                // Handle Updater pattern: if value is a function, call it with the current field value
                let resolvedValue;

                if (typeof value === 'function') {
                  const defaultValue = this.getValue(step as never, name);

                  resolvedValue = value(defaultValue);
                } else {
                  resolvedValue = value;
                }

                this.update({
                  partial: options?.partial ?? false,
                  strict: options?.strict ?? true,
                  debug: options?.debug,
                  silentErrors: options?.silentErrors,
                  targetStep: step,
                  updater: resolvedValue as never,
                  fields: [targetFields] as never,
                });
              },
              reset: (options?: UpdateFn.DebugOptions) =>
                this.reset({
                  fields: [targetFields] as never,
                  targetStep: step,
                  debug: options?.debug,
                  silentErrors: options?.silentErrors,
                }),
            } as never;
          },
          subscribe: this.subscribe,
          getValue: (name) => this.getValue(step as never, name as never),
          selectorCtx: this.createResolvedCtx({
            stepData,
            ctxData,
            logger,
          }) as never,
        });

        // Create useSelector hook for reactive value access via selector
        // This allows getting values from ctx reactively without causing re-renders
        // Pass a function that creates fresh ctx on each call to avoid stale closures
        const useSelector = createUseSelector(
          () => this.createResolvedCtx({ stepData, ctxData, logger }) as never,
          this.subscribe
        );

        // Create Selector component that uses useSelector internally
        // This allows parts of the UI to subscribe to specific values without
        // causing the parent component to re-render
        const Selector = selector.create(
          () => this.createResolvedCtx({ stepData, ctxData, logger }) as never,
          this.subscribe
        );

        let fnInput = {
          ctx: resolvedCtx,
          onInputChange: this.#internal.createStepUpdaterFn(step),
          reset: this.#internal.createStepResetterFn(step),
          Field,
          useSelector,
          Selector,
          ...hookResults,
        };

        if (form) {
          const {
            alias = MultiStepFormSchemaConfig.DEFAULT_FORM_ALIAS,
            ...rest
          } = form;
          const enabledFor = rest.enabledForSteps ?? 'all';

          invariant(typeof alias === 'string', 'The alias must be a string');

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
    targetStep extends StepNumbers<value>,
  >(
    targetStep: targetStep,
    config: CreateComponentImplConfig.stepSpecificConfig<def, value>
  ) {
    const impl = <
      formInstance,
      formInstanceAlias extends string =
        StepSpecificComponent.defaultFormInstanceAlias,
      additionalCtx extends Record<string, unknown> = {},
    >(
      optionsOrFn:
        | StepSpecificComponent.options<
            value,
            targetStep,
            MultiStepFormSchemaConfig.inferFormAlias<value>,
            formInstance,
            additionalCtx
          >
        | StepSpecificComponent.callback<
            def,
            value,
            targetStep,
            MultiStepFormSchemaConfig.inferFormProps<value>,
            { [_ in formInstanceAlias]: formInstance }
          >,
      fn?: StepSpecificComponent.callback<
        def,
        value,
        targetStep,
        MultiStepFormSchemaConfig.inferFormProps<value>,
        { [_ in formInstanceAlias]: formInstance }
      >
    ) => {
      const invariant: Invariant = createInvariant(
        '[createStepSpecificComponent]'
      );

      const createStepSpecificComponent = () => {
        invariant(
          typeof optionsOrFn === 'function',
          'The first argument must be a function'
        );

        return this.createStepSpecificComponentImpl(
          [targetStep],
          config
        )(optionsOrFn);
      };

      if (typeof optionsOrFn === 'object') {
        const { useFormInstance, ctxData, debug } = optionsOrFn;
        const logger = new MultiStepFormLogger({
          debug,
          prefix(prefix) {
            return `${prefix}-${targetStep}-createComponent`;
          },
        });

        logger.info('First argument is an object');

        invariant(
          typeof fn === 'function',
          'The second argument must be a function'
        );

        if (useFormInstance) {
          const {
            render,
            alias = StepSpecificComponent.DEFAULT_FORM_INSTANCE_ALIAS,
          } = useFormInstance;

          invariant(typeof alias === 'string', 'The alias must be a string');

          // const [step] = stepData;

          return this.createStepSpecificComponentImpl([targetStep], config, {
            logger,
            ctxData,
            input: (ctx) => {
              const defaultValues = this.createDefaultValues(
                targetStep
              ) as never;

              return {
                [alias]: () =>
                  render({
                    ctx,
                    defaultValues,
                  }),
              };
            },
          })(fn);
        }

        if (ctxData) {
          return this.createStepSpecificComponentImpl([targetStep], config, {
            logger,
            ctxData,
          })(fn);
        }

        // Empty options object. Can throw here 🤷‍♂️
        // Maybe add "global" - top level config - option to tune fine grained errors.
        return createStepSpecificComponent();
      }

      return createStepSpecificComponent();
    };

    return impl as StepSpecificCreateComponentFn<def, value, targetStep>;
  }

  /**
   * A helper function to create a component for a specific step.
   * @param options The options for creating the step specific component.
   * @param fn A callback that is used for accessing the target step's data and defining
   * any props that the component should have. This function must return a valid `JSX` element.
   * @returns The created component for the step.
   */
  createComponent<
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      StepNumbers<value>
    >,
    props = undefined,
  >(
    options: HelperFn.BaseOptions<value, chosenSteps>,
    fn: CreateComponentCallback<value, chosenSteps, props>
  ) {
    return createComponent({
      fn,
      input: ({ stepData }) => ({
        reset: this.#internal.createHelperFnInputReset(stepData),
        update: this.#internal.createHelperFnInputUpdate(stepData),
      }),
      options,
      value: this.value,
    });
  }

  createDefaultValues<targetStep extends StepNumbers<value>>(
    targetStep: targetStep
  ) {
    return getDefaultValues(this.value, targetStep);
  }
}
