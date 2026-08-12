import {
  buildValuePath,
  createCtx,
  instantiateSteps as instantiateStepsCore,
  type Expand,
  getDefaultValues,
  type getDeepFields,
  type HelperFn,
  HelperFnChosenSteps,
  InvalidComponentError,
  InvalidFieldError,
  InvalidFormConfigError,
  InvalidInternalStateError,
  InvalidStepError,
  MultiStepFormLogger,
  MultiStepFormStepSchema as MultiStepFormStepSchemaBase,
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
import { createUseSelector, deepEqual } from './hooks/use-selector';
import { selector } from './selector';
import {
  type instantiateReactSteps,
  StepSpecificComponent,
  type StepSpecificCreateComponentFn,
} from './steps';
import {
  type CreateComponent,
  type CreatedMultiStepFormComponent,
  getValidatedCustomInputHooks,
  resolvedCtxCreator,
} from './utils';
import { Suspense, createElement, useEffect, type ReactNode } from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

export interface CreateComponentFn<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>,
> {
  <
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      StepNumbers<value>
    >,
    props = undefined,
  >(
    config: HelperFn.BaseOptions<value, chosenSteps> & {
      render: CreateComponent<
        StepSpecificComponent.instanceInput<def, value, chosenSteps>,
        props
      >;
    },
  ): CreatedMultiStepFormComponent<props>;

  /**
   * Creates a reusable component bound to one field in one step.
   * Field metadata and current values are passed to `render`; remaining component props are
   * forwarded as its optional custom props argument.
   */
  forField<
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep>,
    customProps extends object = {},
  >(
    config: StepSpecificComponent.fieldConfig<
      def,
      value,
      targetStep,
      targetField,
      customProps
    > & { step: targetStep },
  ): StepSpecificComponent.fieldComponent<
    def,
    value,
    targetStep,
    targetField,
    customProps
  >;

  /**
   * Creates a reusable component that selects a field from one step when rendered.
   * The returned component requires `field`, while field metadata and current values are
   * passed to `render`.
   */
  forField<
    targetStep extends StepNumbers<value>,
    targetField extends getDeepFields<value, targetStep> = getDeepFields<
      value,
      targetStep
    >,
    customProps extends object = {},
  >(
    config: StepSpecificComponent.selectableFieldConfig<
      def,
      value,
      targetStep,
      targetField,
      customProps
    > & { step: targetStep },
  ): StepSpecificComponent.selectableFieldComponent<
    def,
    value,
    targetStep,
    targetField,
    customProps
  >;
}

export interface HelperFunctions<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>,
> {
  createComponent: CreateComponentFn<def, value>;
}
namespace CreateComponentImplConfig {
  export type stepSpecificConfig<
    def extends StepSchema.Config,
    _value extends instantiateReactSteps<def>,
  > = {
    isStepSpecific: true;
    form?: Record<string, unknown>;
  };

  export type nonStepSpecific = {
    isStepSpecific: false;
  };

  export type config<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
  > = nonStepSpecific | stepSpecificConfig<def, value>;
}

export namespace MultiStepFormStepSchema {
  export type config<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
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

export class MultiStepFormStepSchema<
  const def extends StepSchema.Config,
  value extends instantiateReactSteps<def> = instantiateReactSteps<def>,
>
  extends MultiStepFormStepSchemaBase<def>
  implements HelperFunctions<def, value>
{
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  value: value;
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  readonly #internal: MultiStepFormStepSchemaInternal<def, value>;
  readonly #form?: MultiStepFormSchemaConfig.FormConfig<def, value>;
  readonly createComponent: CreateComponentFn<def, value>;

  constructor(config: MultiStepFormStepSchema.config<def, value>) {
    const { form, ...rest } = config;

    super(rest as never);

    this.value = instantiateStepsCore({
      steps: this.original,
      nameTransformCasing: this.defaultNameTransformationCasing,
    } as never);

    // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
    this.#internal = new MultiStepFormStepSchemaInternal<def, value>({
      originalValue: this.original,
      defaultNameTransformationCasing: this.defaultNameTransformationCasing,
      getValue: () => this.value,
      setValue: (next) => this.handlePostUpdate(next as never),
    });
    this.#form = form;

    this.sync();

    const createFormConfig = MultiStepFormSchemaConfig.instantiateFormConfig(
      () => this.value as never,
      this.subscribe,
      Object.keys(this.value) as StepNumbers<value>[],
    );
    this.value = this.#internal.enrichValues(this.value, (step) => {
      const targetStep = `step${step}` as StepNumbers<value>;

      const id = form?.id ?? targetStep;
      const instantiatedForm = createFormConfig(form as never, id);

      return {
        createComponent: this.createStepSpecificComponentFactory(targetStep, {
          isStepSpecific: true,
          form: instantiatedForm,
        }),
      };
    });

    // A function object preserves the callable factory while grouping the field-specific
    // variant under the API it specializes.
    this.createComponent = Object.assign(this.createComponentImpl.bind(this), {
      forField: <
        targetStep extends StepNumbers<value>,
        targetField extends getDeepFields<value, targetStep>,
        customProps extends object = {},
      >(
        componentConfig: StepSpecificComponent.fieldConfig<
          def,
          value,
          targetStep,
          targetField,
          customProps
        > & { step: targetStep },
      ) => {
        InvalidComponentError.invariant(
          typeof componentConfig === 'object' && componentConfig !== null,
          {
            reason:
              'The argument must be a field component configuration object',
            component: 'createFieldComponent',
            argument: 'config',
            value: componentConfig,
          },
        );

        const { step, ...fieldConfig } = componentConfig;
        InvalidStepError.invariant(this.steps.isValidStep(step), {
          reason: `The target step ${step} is invalid`,
          targetStep: step,
          validSteps: [...this.steps.value],
        });
        const target = this.value[step] as {
          createComponent: StepSpecificCreateComponentFn<
            def,
            value,
            targetStep
          >;
        };

        return target.createComponent.forField(fieldConfig as never);
      },
    }) as CreateComponentFn<def, value>;
  }

  private createResolvedCtx<
    // Safe to use tuple notation here since the step specific `createComponent` will always have
    // `stepData` as a tuple
    chosenStep extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>,
    additionalCtx extends Record<string, unknown>,
  >(
    options: {
      stepData: chosenStep;
      logger: MultiStepFormLogger;
    } & HelperFn.CtxDataSelector<value, chosenStep, additionalCtx>,
  ) {
    const { logger, stepData, ctxData } = options;
    // Create ctx fresh each time to ensure it has the latest this.value
    const ctx = createCtx(this.value, stepData);

    if (ctxData) {
      const [targetStep] = stepData;
      const { [targetStep]: _, ...values } = this.value;
      const createResolvedCtx = resolvedCtxCreator(logger, values);

      return createResolvedCtx({ ctx, ctxData } as never);
    }

    return ctx;
  }

  private createUseStep<targetStep extends StepNumbers<value>>(
    step: targetStep,
  ): StepSpecificComponent.useStep<def, value, targetStep> {
    type StepResult<TError extends Error = Error> =
      StepSpecificComponent.useStepResult<value, targetStep, TError>;

    let cachedSnapshot: StepResult | undefined;

    const getSnapshot = () => {
      const data = this.value[step] as HelperFnChosenSteps.currentStep<
        value,
        [targetStep]
      >;
      const status = this.getStepStatus(step as never);
      const error = this.getStepError(step as never);

      if (
        cachedSnapshot &&
        Object.is(cachedSnapshot.data, data) &&
        Object.is(cachedSnapshot.status, status) &&
        Object.is(cachedSnapshot.error, error)
      ) {
        return cachedSnapshot;
      }

      const nextSnapshot: StepResult = {
        data,
        status,
        error: error as Error | undefined,
      };
      cachedSnapshot = nextSnapshot;

      return nextSnapshot;
    };

    function identity<T>(result: T) {
      return result;
    }

    function selectedValuesEqual(first: unknown, second: unknown) {
      if (Object.is(first, second)) {
        return true;
      }

      if (
        first === null ||
        second === null ||
        typeof first !== 'object' ||
        typeof second !== 'object'
      ) {
        return false;
      }

      return deepEqual(first, second);
    }

    const useStep = <
      TError extends Error = Error,
      TSelected = StepResult<TError>,
    >(
      options?: StepSpecificComponent.useStepOptions<
        def,
        value,
        targetStep,
        TError,
        TSelected
      >,
    ) => {
      const getTypedSnapshot = () => getSnapshot() as StepResult<TError>;
      const selected = useSyncExternalStoreWithSelector(
        this.subscribe,
        getTypedSnapshot,
        getTypedSnapshot,
        options?.selector ??
          (identity as (result: StepResult<TError>) => TSelected),
        selectedValuesEqual,
      );

      useEffect(() => {
        void this.resolveStep(step as never).catch(() => {
          // Errors are persisted on the step state and exposed through `useStep`.
        });
      }, []);

      return selected;
    };

    return useStep as StepSpecificComponent.useStep<def, value, targetStep>;
  }

  private createStepSuspend<targetStep extends StepNumbers<value>>(
    step: targetStep,
  ) {
    return (props: { children: ReactNode; fallback: ReactNode }) => {
      const { children, fallback } = props;

      const StepResolutionGate = () => {
        this.suspendStep(step as never);

        return children;
      };

      return createElement(
        Suspense,
        { fallback },
        createElement(StepResolutionGate),
      );
    };
  }

  private createStepSpecificComponentImpl<
    // Safe to use tuple notation here since the step specific `createComponent` will always have
    // `stepData` as a tuple
    chosenStep extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>,
    additionalCtx extends Record<string, unknown> = {},
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.stepSpecificConfig<def, value>,
    extraConfig?: {
      logger?: MultiStepFormLogger;
      input?: (
        ctx: Expand<HelperFn.buildCtx<value, chosenStep>>,
      ) => Record<string, unknown>;
    } & HelperFn.CtxDataSelector<value, chosenStep, additionalCtx>,
  ) {
    const [step] = stepData;
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
        const { form } = config;

        InvalidStepError.invariant(this.steps.isValidStep(step), {
          reason: `The target step ${step} is invalid`,
          targetStep: step,
          validSteps: [...this.steps.value],
        });

        const stepNumber = Number.parseInt(step.replace('step', ''));

        InvalidInternalStateError.invariant(!Number.isNaN(stepNumber), {
          reason: `Unable to extract a number from ${step}`,
          operation: 'createComponent',
          value: step,
        });
        const current = this.value[step];

        InvalidInternalStateError.invariant(
          typeof current === 'object' && current !== null,
          {
            reason: `The current step must be an object, was ${typeof current}`,
            operation: 'createComponent',
            value: current,
          },
        );
        // These checks are mostly for type safety. `current` should _always_ be in the proper format.
        // On the off chance that it's not, we have the checks here to help, but these checks are basically
        // just for type safety.
        InvalidInternalStateError.invariant('fields' in current, {
          reason: 'Unable to find the "fields" for the current step',
          operation: 'createComponent',
          value: current,
        });
        InvalidInternalStateError.invariant(
          typeof current.fields === 'object',
          {
            reason: `The "fields" property must be an object, was ${typeof current.fields}`,
            operation: 'createComponent',
            value: current.fields,
          },
        );

        // Memoize Field component to prevent remounting on every render
        // This ensures input focus is maintained when ctx changes
        const Field = field.create({
          propsCreator: (name) => {
            // Access current step data directly to avoid stale closure
            const currentStep = this.value[step] as typeof current;
            const currentFields = Object.keys(
              currentStep.fields as Record<string, unknown>,
            );
            InvalidFieldError.invariant(typeof name === 'string', {
              reason: `The "name" prop must be a string and a valid field for ${step}`,
              targetStep: step,
              field: name,
              validFields: currentFields,
            });
            // TODO add support for deep keys (`name`)

            const allAvailableFields = path
              .createDeep(currentStep.fields)
              .map((value) => (value as string).replace('.defaultValue.', '.'));

            InvalidFieldError.invariant(allAvailableFields.includes(name), {
              reason: `The field "${name}" doesn't exist for ${step}`,
              targetStep: step,
              field: name,
              validFields: allAvailableFields,
            });
            InvalidInternalStateError.invariant('update' in currentStep, {
              reason: `No "update" function was found for ${step}`,
              operation: 'Field',
              value: currentStep,
            });

            const defaultValue = this.getValue(step as never, name);
            const builtValuePath = buildValuePath(name);
            const fieldName = String(name);
            const [parentFieldName] = fieldName.split('.');
            const fieldsRecord = currentStep.fields as Record<string, unknown>;
            const { label, nameTransformCasing, type } = fieldsRecord[
              parentFieldName
            ] as {
              label?: unknown;
              nameTransformCasing?: unknown;
              type?: unknown;
            };

            const targetFields = `fields.${builtValuePath}`;

            return {
              defaultValue,
              ...(label === undefined ? {} : { label }),
              nameTransformCasing,
              ...(type === undefined ? {} : { type }),
              name,
              onInputChange: <
                strict extends boolean = true,
                partial extends boolean = false,
              >(
                value: unknown,
                options?: field.onInputChangeOptions<strict, partial>,
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
          selectorCtx: () =>
            this.createResolvedCtx({
              stepData,
              ctxData,
              logger,
            }) as never,
          suspendStep: () => {
            this.suspendStep(step as never);
          },
        });

        // Create useSelector hook for reactive value access via selector
        // This allows getting values from ctx reactively without causing re-renders
        // Pass a function that creates fresh ctx on each call to avoid stale closures
        const useSelector = createUseSelector(
          () => this.createResolvedCtx({ stepData, ctxData, logger }) as never,
          this.subscribe,
        );

        // Create Selector component that uses useSelector internally
        // This allows parts of the UI to subscribe to specific values without
        // causing the parent component to re-render
        const Selector = selector.create(
          () => this.createResolvedCtx({ stepData, ctxData, logger }) as never,
          this.subscribe,
        );
        const useStep = this.createUseStep(step);
        const SuspendStep = this.createStepSuspend(step);

        let fnInput = {
          ctx: resolvedCtx,
          update: this.#internal.createHelperFnInputUpdate(stepData),
          onInputChange: this.#internal.createStepUpdaterFn(step),
          reset: this.#internal.createStepResetterFn(step),
          Field,
          Suspend: SuspendStep,
          useStep,
          useSelector,
          Selector,
          defaultValues: this.createDefaultValues(step as never) as never,
          ...hookResults,
        };

        if (form) {
          // `form` is the already-instantiated form object produced by
          // `instantiateFormConfig`: { alias, enabledForSteps, [alias]: component }.
          // `render` no longer exists on it, so we must read the pre-built
          // component from `form[alias]` instead of recreating it.
          const instantiated = form as unknown as Record<string, unknown>;
          const alias =
            (instantiated.alias as string) ??
            MultiStepFormSchemaConfig.DEFAULT_FORM_ALIAS;
          const enabledFor =
            (instantiated.enabledForSteps as
              MultiStepFormSchemaConfig.formEnabledFor<value> | undefined) ??
            'all';

          InvalidFormConfigError.invariant(typeof alias === 'string', {
            reason: 'The alias must be a string',
            property: 'alias',
            value: alias,
            expected: 'string',
          });

          if (
            MultiStepFormSchemaConfig.isFormAvailable(
              stepData as never,
              enabledFor as never,
            )
          ) {
            fnInput = {
              ...fnInput,
              [alias]: instantiated[alias],
            };
          }

          return fn(fnInput, props);
        }

        return fn(fnInput, props);
      }) as CreatedMultiStepFormComponent<props>;
  }

  private createStepSpecificComponentFactory<
    targetStep extends StepNumbers<value>,
  >(
    targetStep: targetStep,
    config: CreateComponentImplConfig.stepSpecificConfig<def, value>,
  ) {
    const impl = <
      additionalCtx extends Record<string, unknown> = {},
      props = undefined,
    >(
      componentConfig: StepSpecificComponent.config<
        def,
        value,
        targetStep,
        props,
        additionalCtx
      >,
    ) => {
      InvalidComponentError.invariant(
        typeof componentConfig === 'object' && componentConfig !== null,
        {
          reason: 'The argument must be a component configuration object',
          component: 'createStepSpecificComponent',
          argument: 'config',
          value: componentConfig,
        },
      );

      const { ctxData, debug, render } = componentConfig;

      InvalidComponentError.invariant(typeof render === 'function', {
        reason: 'The "render" property must be a function',
        component: 'createStepSpecificComponent',
        argument: 'config.render',
        value: render,
      });

      const logger = new MultiStepFormLogger({
        debug,
        prefix(prefix) {
          return `${prefix}-${targetStep}-createComponent`;
        },
      });

      return this.createStepSpecificComponentImpl([targetStep], config, {
        logger,
        ctxData,
      })(render);
    };

    const forField = <
      targetField extends getDeepFields<value, targetStep>,
      customProps extends object = {},
    >(
      fieldConfig: StepSpecificComponent.fieldConfig<
        def,
        value,
        targetStep,
        targetField,
        customProps
      >,
    ) => {
      InvalidComponentError.invariant(
        typeof fieldConfig === 'object' && fieldConfig !== null,
        {
          reason: 'The argument must be a field component configuration object',
          component: 'createFieldComponent',
          argument: 'config',
          value: fieldConfig,
        },
      );

      const { field: configuredField, fields, render } = fieldConfig as typeof fieldConfig & {
        fields?: readonly targetField[];
      };

      InvalidComponentError.invariant(typeof render === 'function', {
        reason: 'The "render" property must be a function',
        component: 'createFieldComponent',
        argument: 'config.render',
        value: render,
      });

      // Reuse the existing Field component so specialized components inherit its subscriptions,
      // validation, deep-field support, and update/reset behavior. When the configuration omits
      // a field, ownership moves to the returned component so one implementation can serve every
      // compatible field in the step.
      return impl({
        render: (
          { Field }: StepSpecificComponent.input<def, value, targetStep, {}>,
          componentProps: StepSpecificComponent.fieldComponentProps<
            def,
            value,
            targetStep,
            targetField,
            customProps
          >,
        ) => {
          const { field: selectedField, ...forwardedProps } = componentProps as
            StepSpecificComponent.fieldComponentProps<
              def,
              value,
              targetStep,
              targetField,
              customProps
            > & { field?: targetField };
          const targetField = configuredField ?? selectedField;

          InvalidFieldError.invariant(targetField !== undefined, {
            reason:
              'The returned field component requires a "field" prop because its configuration did not provide one',
            targetStep,
          });

          InvalidFieldError.invariant(
            fields === undefined || fields.includes(targetField),
            {
              reason: 'The selected field is not included in the configured "fields" list',
              targetStep,
              targetField,
            },
          );

          return createElement(
            Field as never,
            {
              ...forwardedProps,
              name: targetField,
              children: (fieldProps: unknown) =>
                render(
                  fieldProps as never,
                  forwardedProps as unknown as customProps,
                ),
            } as never,
          );
        },
      } as never);
    };

    return Object.assign(impl, { forField }) as StepSpecificCreateComponentFn<
      def,
      value,
      targetStep
    >;
  }

  /**
   * Creates a component from selected step data and an object-based render configuration.
   */
  private createComponentImpl<
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    props = undefined,
  >(
    componentConfig: HelperFn.BaseOptions<value, chosenSteps> & {
      render: CreateComponent<
        StepSpecificComponent.instanceInput<def, value, chosenSteps>,
        props
      >;
    },
  ) {
    InvalidComponentError.invariant(
      typeof componentConfig === 'object' && componentConfig !== null,
      {
        reason: 'The argument must be a component configuration object',
        component: 'createComponent',
        argument: 'config',
        value: componentConfig,
      },
    );

    const { render, ...options } = componentConfig;

    InvalidComponentError.invariant(typeof render === 'function', {
      reason: 'The "render" property must be a function',
      component: 'createComponent',
      argument: 'config.render',
      value: render,
    });

    // A single-step instance component delegates to the step-specific implementation so its
    // runtime input and public type stay identical as new step utilities are added.
    if (Array.isArray(options.stepData) && options.stepData.length === 1) {
      const [targetStep] = options.stepData as [StepNumbers<value>];
      const step = this.value[targetStep] as {
        createComponent: (config: {
          render: unknown;
        }) => CreatedMultiStepFormComponent<props>;
      };

      return step.createComponent({ render } as never);
    }

    const stepData = options.stepData as chosenSteps;
    const getCtx = () => createCtx(this.value, stepData);
    const useSelector = createUseSelector(getCtx as never, this.subscribe);
    const Selector = selector.create(getCtx as never, this.subscribe);
    const selectedSteps = this.getSelectedSteps(stepData);
    const Field = this.createMultiStepField(selectedSteps);
    const defaultFormId = selectedSteps.join('-');
    const form = MultiStepFormSchemaConfig.instantiateFormConfig(
      () => this.value,
      this.subscribe,
      Object.keys(this.value) as StepNumbers<value>[],
    )(this.#form, defaultFormId) as
      | undefined
      | ({
          alias: string;
          enabledForSteps: HelperFnChosenSteps.main<
            value,
            StepNumbers<value>
          >;
        } & Record<string, unknown>);

    return ((props: props) => {
      const input: Record<string, unknown> = {
        ctx: getCtx(),
        reset: this.#internal.createHelperFnInputReset(stepData),
        update: this.#internal.createHelperFnInputUpdate(stepData),
        Field,
        useSelector,
        Selector,
        defaultValues: this.createMultiStepDefaultValues(selectedSteps),
      };

      if (
        form &&
        MultiStepFormSchemaConfig.isFormAvailable(
          stepData as never,
          form.enabledForSteps as never,
        )
      ) {
        input[form.alias] = form[form.alias];
      }

      return render(
        input as StepSpecificComponent.instanceInput<
          def,
          value,
          chosenSteps
        >,
        props,
      );
    }) as CreatedMultiStepFormComponent<props>;
  }

  private getSelectedSteps<
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
  >(stepData: chosenSteps) {
    if (stepData === 'all') {
      return Object.keys(this.value) as StepNumbers<value>[];
    }

    if (Array.isArray(stepData)) {
      return [...stepData] as StepNumbers<value>[];
    }

    return Object.keys(stepData) as StepNumbers<value>[];
  }

  private createMultiStepField(selectedSteps: StepNumbers<value>[]) {
    type BridgeProps = {
      children: (props: Record<string, unknown>) => ReactNode;
      fieldName: string;
      qualifiedName: string;
    } & Record<string, unknown>;

    const fields = new Map<string, CreatedMultiStepFormComponent<BridgeProps>>();

    for (const step of selectedSteps) {
      const stepValue = this.value[step] as {
        createComponent: (config: {
          render: (input: { Field: Function }, props: BridgeProps) => ReactNode;
        }) => CreatedMultiStepFormComponent<BridgeProps>;
      };
      const StepField = stepValue.createComponent({
        render({ Field }, props) {
          const {
            children,
            fieldName,
            qualifiedName,
            ...fieldOptions
          } = props;

          return createElement(Field as never, {
            ...fieldOptions,
            name: fieldName,
            children: (fieldProps: Record<string, unknown>) =>
              children({ ...fieldProps, name: qualifiedName }),
          } as never);
        },
      });

      fields.set(step, StepField);
    }

    return (props: {
      name: string;
      children: (props: Record<string, unknown>) => ReactNode;
    }) => {
      const { name, children, ...fieldOptions } = props;

      InvalidFieldError.invariant(typeof name === 'string', {
        reason: 'The multi-step Field "name" prop must be a string',
        field: name,
      });

      const separatorIndex = name.indexOf('.');
      const step = name.slice(0, separatorIndex);
      const fieldName = name.slice(separatorIndex + 1);

      InvalidFieldError.invariant(
        separatorIndex > 0 && fields.has(step),
        {
          reason: `The field name "${name}" must start with one of the selected steps`,
          field: name,
          validSteps: selectedSteps,
        },
      );

      const StepField = fields.get(step)!;

      return createElement(StepField as never, {
        ...fieldOptions,
        children,
        fieldName,
        qualifiedName: name,
      } as never);
    };
  }

  private createMultiStepDefaultValues(
    selectedSteps: StepNumbers<value>[],
  ) {
    const grouped = Object.fromEntries(
      selectedSteps.map((step) => [step, this.createDefaultValues(step)]),
    );
    const fields = new Map<string, Array<[string, unknown]>>();

    for (const [step, defaultValues] of Object.entries(grouped)) {
      for (const [field, defaultValue] of Object.entries(defaultValues)) {
        const matches = fields.get(field) ?? [];

        matches.push([step, defaultValue]);
        fields.set(field, matches);
      }
    }

    const flat = Object.fromEntries(
      [...fields].map(([field, matches]) => [
        field,
        matches.length === 1 ? matches[0][1] : Object.fromEntries(matches),
      ]),
    );

    return { grouped, flat };
  }

  createDefaultValues<targetStep extends StepNumbers<value>>(
    targetStep: targetStep,
  ) {
    return getDefaultValues(this.value, targetStep);
  }
}
