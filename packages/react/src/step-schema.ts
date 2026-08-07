import {
  buildValuePath,
  createCtx,
  instantiateSteps as instantiateStepsCore,
  type Expand,
  getDefaultValues,
  type HelperFn,
  type HelperFnChosenSteps,
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
  createComponent,
  type CreateComponentCallback,
  type CreatedMultiStepFormComponent,
  getValidatedCustomInputHooks,
  resolvedCtxCreator,
} from './utils';
import {
  Suspense,
  createElement,
  useEffect,
  type ReactNode,
} from 'react';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

export type CreateComponentFn<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>
> = <targetStep extends StepNumbers<value>, props = undefined>(
  options: HelperFn.BaseOptions<value, [targetStep]>,
  fn: CreateComponentCallback<value, [targetStep], props>
) => CreatedMultiStepFormComponent<props>;

export interface HelperFunctions<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>
> {
  createComponent: CreateComponentFn<def, value>;
}
namespace CreateComponentImplConfig {
  export type stepSpecificConfig<
    def extends StepSchema.Config,
    _value extends instantiateReactSteps<def>
  > = {
    isStepSpecific: true;
    defaultId: string;
    form?: Record<string, unknown>;
  };

  export type nonStepSpecific = {
    isStepSpecific: false;
  };

  export type config<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>
  > = nonStepSpecific | stepSpecificConfig<def, value>;
}

export namespace MultiStepFormStepSchema {
  export type config<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def>
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
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>
  >
  extends MultiStepFormStepSchemaBase<def>
  implements HelperFunctions<def, value>
{
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  value: value;
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  readonly #internal: MultiStepFormStepSchemaInternal<def, value>;

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

    this.sync();

    const createFormConfig = MultiStepFormSchemaConfig.instantiateFormConfig(
      this.value as never,
      this.steps.value
    );
    const instantiatedForm = createFormConfig(form as never);
    this.value = this.#internal.enrichValues(this.value, (step) => {
      const targetStep = `step${step}` as StepNumbers<value>;

      const id = form?.id ?? targetStep;

      return {
        createComponent: this.createStepSpecificComponentFactory(targetStep, {
          isStepSpecific: true,
          defaultId: id,
          form: instantiatedForm,
        }),
      };
    });
  }

  private createResolvedCtx<
    // Safe to use tuple notation here since the step specific `createComponent` will always have
    // `stepData` as a tuple
    chosenStep extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>,
    additionalCtx extends Record<string, unknown>
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

    const useStep = <TError extends Error = Error, TSelected = StepResult<TError>>(
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
    additionalCtx extends Record<string, unknown> = {}
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

        InvalidStepError.invariant(
          this.steps.isValidStep(step),
          {
            reason: `The target step ${step} is invalid`,
            targetStep: step,
            validSteps: [...this.steps.value],
          },
        );

        const stepNumber = Number.parseInt(step.replace('step', ''));

        InvalidInternalStateError.invariant(
          !Number.isNaN(stepNumber),
          {
            reason: `Unable to extract a number from ${step}`,
            operation: 'createComponent',
            value: step,
          },
        );
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
        InvalidInternalStateError.invariant(
          'fields' in current,
          {
            reason: 'Unable to find the "fields" for the current step',
            operation: 'createComponent',
            value: current,
          },
        );
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
              currentStep.fields as Record<string, unknown>
            );
            InvalidFieldError.invariant(
              typeof name === 'string',
              {
                reason: `The "name" prop must be a string and a valid field for ${step}`,
                targetStep: step,
                field: name,
                validFields: currentFields,
              },
            );
            // TODO add support for deep keys (`name`)

            const allAvailableFields = path
              .createDeep(currentStep.fields)
              .map((value) => (value as string).replace('.defaultValue.', '.'));

            InvalidFieldError.invariant(
              allAvailableFields.includes(name),
              {
                reason: `The field "${name}" doesn't exist for ${step}`,
                targetStep: step,
                field: name,
                validFields: allAvailableFields,
              },
            );
            InvalidInternalStateError.invariant(
              'update' in currentStep,
              {
                reason: `No "update" function was found for ${step}`,
                operation: 'Field',
                value: currentStep,
              },
            );

            const defaultValue = this.getValue(step as never, name);
            const builtValuePath = buildValuePath(name);
            const fieldName = String(name);
            const [parentFieldName] = fieldName.split('.');
            const fieldsRecord = currentStep.fields as Record<string, unknown>;
            const {
              label,
              nameTransformCasing,
              type,
            } = fieldsRecord[parentFieldName] as {
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
                partial extends boolean = false
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
          this.subscribe
        );

        // Create Selector component that uses useSelector internally
        // This allows parts of the UI to subscribe to specific values without
        // causing the parent component to re-render
        const Selector = selector.create(
          () => this.createResolvedCtx({ stepData, ctxData, logger }) as never,
          this.subscribe
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
              | MultiStepFormSchemaConfig.formEnabledFor<value>
              | undefined) ?? 'all';

          InvalidFormConfigError.invariant(typeof alias === 'string', {
            reason: 'The alias must be a string',
            property: 'alias',
            value: alias,
            expected: 'string',
          });

          if (
            MultiStepFormSchemaConfig.isFormAvailable(
              stepData as never,
              enabledFor as never
            )
          ) {
            fnInput = {
              ...fnInput,
              [alias]: instantiated[alias],
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
    targetStep extends StepNumbers<value>
  >(
    targetStep: targetStep,
    config: CreateComponentImplConfig.stepSpecificConfig<def, value>
  ) {
    const impl = <additionalCtx extends Record<string, unknown> = {}, props = undefined>(
      optionsOrFn:
        | StepSpecificComponent.options<value, targetStep, additionalCtx>
        | StepSpecificComponent.callback<def, value, targetStep, props, additionalCtx>,
      fn?: StepSpecificComponent.callback<def, value, targetStep, props, additionalCtx>
    ) => {
      const createStepSpecificComponent = () => {
        InvalidComponentError.invariant(
          typeof optionsOrFn === 'function',
          {
            reason: 'The first argument must be a function',
            component: 'createStepSpecificComponent',
            argument: 'optionsOrFn',
            value: optionsOrFn,
          },
        );

        return this.createStepSpecificComponentImpl(
          [targetStep],
          config
        )(optionsOrFn);
      };

      if (typeof optionsOrFn === 'object') {
        const { ctxData, debug } = optionsOrFn;
        const logger = new MultiStepFormLogger({
          debug,
          prefix(prefix) {
            return `${prefix}-${targetStep}-createComponent`;
          },
        });

        logger.info('First argument is an object');

        InvalidComponentError.invariant(
          typeof fn === 'function',
          {
            reason: 'The second argument must be a function',
            component: 'createStepSpecificComponent',
            argument: 'fn',
            value: fn,
          },
        );

        if (ctxData) {
          return this.createStepSpecificComponentImpl([targetStep], config, {
            logger,
            ctxData,
          })(fn);
        }

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
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    props = undefined
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
