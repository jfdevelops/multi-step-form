import {
  Expand,
  HelperFnChosenSteps,
  InvalidFormConfigError,
  InvalidStepError,
  MultiStepFormStepSchema,
  type StepNumbers,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import {
  type ComponentPropsWithRef,
  type ReactNode,
  useSyncExternalStore,
} from 'react';
import type { CreatedMultiStepFormComponent } from './utils';
import type { instantiateReactSteps } from './steps';

export namespace MultiStepFormSchemaConfig {
  export const DEFAULT_FORM_ALIAS = 'Form';
  export type defaultEnabledFor = HelperFnChosenSteps.defaultStringOption;
  export type defaultFormAlias = typeof DEFAULT_FORM_ALIAS;
  export type formEnabledFor<value extends instantiateReactSteps> =
    HelperFnChosenSteps.main<value, StepNumbers<value>>;
  type strippedResolvedSteps<value extends instantiateReactSteps> = {
    [
      key in keyof value as key extends string
        ? `step${number}` extends key
          ? never
          : key
        : key
    ]: Expand<
      Omit<
        value[key],
        'createComponent' | 'createHelperFn' | 'update' | 'reset'
      >
    >;
  };
  export type inferFormAlias<def> = def extends {
    alias: infer alias extends string;
  }
    ? alias
    : defaultFormAlias;
  export type inferFormProps<def> = def extends {
    render: infer render;
  }
    ? render extends (...args: infer args) => ReactNode
      ? args extends [context: any, customProps: infer props, ...rest: any[]]
        ? props
        : undefined
      : undefined
    : undefined;
  export namespace EnabledForSteps {
    export type get<def> = def extends {
      enabledForSteps: infer enabledForSteps;
    }
      ? enabledForSteps // Case: `enabledForSteps` isn't provided (default behavior)
      : def extends { form: infer form }
        ? form extends { enabledForSteps: infer enabledForSteps }
          ? enabledForSteps // Case: `enabledForSteps` is provided in the form config
          : never
        : never;
    export type resolveType<
      def extends StepSchema.Config,
      steps extends instantiateReactSteps<def>,
      value = instantiateFormConfig<def>,
    > =
      get<value> extends defaultEnabledFor
        ? 'all'
        : get<value> extends HelperFnChosenSteps.tupleNotation<
              StepNumbers<steps>
            >
          ? 'tuple'
          : get<value> extends HelperFnChosenSteps.objectNotation<
                StepNumbers<steps>
              >
            ? 'object'
            : never;
  }

  export type inferFormEnabledForSteps<def> = def extends {
    // TODO decide if `enabledForSteps` validation is needed
    enabledForSteps: infer enabledForSteps;
  }
    ? enabledForSteps
    : defaultEnabledFor;
  export type inferComponent<def> = def extends { render: infer render }
    ? render extends (...args: any[]) => ReactNode
      ? CreatedMultiStepFormComponent<inferFormProps<def>>
      : never
    : never;
  export type inferredFormComponent<def> = {
    [key in inferFormAlias<def>]: inferComponent<def>;
  };

  export type instantiateFormConfig<def> = [def] extends [object]
    ? def extends { form: infer form }
      ? [form] extends [never]
        ? never
        : keyof FormConfig.withoutRender<form> extends never
          ? Expand<
              {
                alias: inferFormAlias<form>;
                enabledForSteps: inferFormEnabledForSteps<form>;
              } & inferredFormComponent<form>
            >
          : {
              -readonly [key in keyof FormConfig.withoutRender<form>]: Expand<
                {
                  alias: inferFormAlias<FormConfig.withoutRender<form>>;
                  enabledForSteps: inferFormEnabledForSteps<
                    FormConfig.withoutRender<form>
                  >;
                } & inferredFormComponent<form>
              >;
            }[keyof FormConfig.withoutRender<form>]
      : {}
    : {};
  export type getEnabledForSteps<def> =
    instantiateFormConfig<def> extends {
      enabledForSteps: infer enabledForSteps;
    }
      ? enabledForSteps
      : def;
  export type AvailableStepForForm<
    value extends instantiateReactSteps,
    enabledFor extends formEnabledFor<value>,
  > = enabledFor extends defaultEnabledFor
    ? strippedResolvedSteps<value>
    : enabledFor extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>
      ? enabledFor[number] extends keyof value
        ? Pick<
            strippedResolvedSteps<value>,
            Extract<enabledFor[number], keyof strippedResolvedSteps<value>>
          >
        : never
      : keyof enabledFor extends keyof value
        ? Expand<
            Pick<
              strippedResolvedSteps<value>,
              Extract<keyof enabledFor, keyof strippedResolvedSteps<value>>
            >
          >
        : never;
  export type formCtx<alias extends string, props> = {
    [_ in alias]: CreatedMultiStepFormComponent<props>;
  };
  type renderContextSteps<value extends instantiateReactSteps> = Expand<
    strippedResolvedSteps<value>
  >;

  function createRenderSteps(steps: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(steps).map(([key, value]) => {
        if (value === null || typeof value !== 'object') {
          return [key, value];
        }

        const renderStep = { ...value } as Record<string, unknown>;

        delete renderStep.createComponent;
        delete renderStep.createHelperFn;
        delete renderStep.update;
        delete renderStep.reset;

        return [key, renderStep];
      }),
    );
  }

  type renderContextStep<steps extends Record<string, unknown>> = Extract<
    keyof steps,
    string
  >;
  type defaultRenderProps = Omit<ComponentPropsWithRef<'div'>, 'children'>;
  type renderCallback<props> = props extends undefined
    ? (props?: defaultRenderProps) => ReactNode
    : (props: props) => ReactNode;

  export type getCurrentStepDataOptions<
    steps extends Record<string, unknown>,
    targetStep extends renderContextStep<steps>,
    props,
    isDataGuaranteed extends boolean = false,
  > = {
    targetStep: targetStep;
    isDataGuaranteed?: isDataGuaranteed;
    notFoundMessage?: (
      context: { targetStep: targetStep },
      props: props,
    ) => ReactNode;
  };

  type currentStepDataResult<
    steps extends Record<string, unknown>,
    targetStep extends renderContextStep<steps>,
    props,
    hasData extends boolean,
  > = {
    data: hasData extends true ? steps[targetStep] : undefined;
    hasData: hasData;
    NoCurrentData: renderCallback<props>;
  };

  export type getCurrentStepData<steps extends Record<string, unknown>> = <
    targetStep extends renderContextStep<steps>,
    props = undefined,
    isDataGuaranteed extends boolean = false,
  >(
    options: getCurrentStepDataOptions<
      steps,
      targetStep,
      props,
      isDataGuaranteed
    >,
  ) => isDataGuaranteed extends true
    ? Omit<currentStepDataResult<steps, targetStep, props, true>, 'hasData'>
    : | currentStepDataResult<steps, targetStep, props, true>
      | currentStepDataResult<steps, targetStep, props, false>;

  export type getProgressOptions<
    steps extends Record<string, unknown>,
    targetStep extends renderContextStep<steps>,
    props,
  > = {
    targetStep: targetStep;
    totalSteps?: number;
    maxProgressValue?: number;
    progressTextTransformer?: (
      context: {
        targetStep: targetStep;
        totalSteps: number;
        maxProgressValue: number;
      },
      props: props,
    ) => ReactNode;
  };

  export type getProgress<steps extends Record<string, unknown>> = <
    targetStep extends renderContextStep<steps>,
    props = undefined,
  >(
    options: getProgressOptions<steps, targetStep, props>,
  ) => {
    value: number;
    maxProgressValue: number;
    ProgressText: renderCallback<props>;
  };

  export type renderContext<steps extends Record<string, unknown>> = {
    /**
     * The id for the form, either a custom one or the default one.
     */
    id: string;
    /**
     * The latest data for every step in the schema.
     */
    steps: steps;
    /**
     * Gets live data for a step without requiring a hook inside `render`.
     */
    getCurrentStepData: getCurrentStepData<steps>;
    /**
     * Calculates live progress and returns its `ProgressText` component without requiring a
     * hook inside `render`.
     */
    getProgress: getProgress<steps>;
    /**
     * Checks whether a concrete schema step is complete.
     */
    isStepComplete: (targetStep: renderContextStep<steps>) => boolean;
  };

  export namespace FormConfig {
    export type withoutRender<def> = Omit<def, 'render'>;
  }

  export type formDefinition<formConfig> =
    FormConfig.withoutRender<formConfig> & {
      render: (
        context: unknown,
        customProps: inferFormProps<formConfig>,
      ) => ReactNode;
    };

  /**
   * The configuration options for the `form` option.
   */
  export interface FormConfig<
    def extends StepSchema.Config = StepSchema.Config,
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>,
    customProps = undefined,
  > {
    /**
     * The `id` for the form component.
     *
     * If there is no value provided, the default id will the **current step key**.
     *
     * @default `${currentStep}`
     */
    id?: string;
    /**
     * The "name" of the form component.
     * @default 'Form'
     * @example
     * ```tsx
     * const schema = defineMultiStepForm({
     *  steps: {
     *    step1: {
     *      title: 'Step 1',
     *      fields: {
     *        firstName: {
     *          defaultValue: ''
     *       }
     *     }
     *   },
     *   form: {
     *    alias: 'MyCustomForm',
     *    render() {
     *      // return custom form component here
     *     }
     *   }
     *  }
     * })
     *
     * const Step1 = schema.stepSchema.step1.createComponent({
     *   render({ ctx, MyCustomForm }, props: { children: ReactNode }) {
     *     // Notice how the form is available with its alias
     *     return <MyCustomFormName>{children}</MyCustomFormName>;
     *   },
     * })
     * ```
     */
    alias?: string;
    /**
     * If the form component should be accessible for each step when calling `createComponent`.
     *
     * If no value is given, the form will be accessible for all the
     */
    enabledForSteps?: HelperFnChosenSteps.main<value, StepNumbers<value>>;
    /**
     *
     * @param context The current form id, live step data, and hook-free derived-data callbacks.
     * @param customProps Props supplied to the injected form component.
     * @returns The rendered custom form.
     * @example
     * ### With custom props
     * ```tsx
     * type CustomProps = {
     *   title: string;
     *   description?: string;
     *   children: ReactNode;
     * };
     *
     * const schema = defineMultiStepForm({
     *  steps: {
     *    step1: {
     *      title: 'Step 1',
     *      fields: {
     *        firstName: {
     *          defaultValue: ''
     *       }
     *     }
     *   },
     *   form: {
     *    alias: 'MyCustomForm',
     *    render(context, props: CustomProps) {
     *      const { ProgressText } = context.getProgress({ targetStep: 'step1' });
     *      return (
     *         <div>
     *          <h1>{props.title}</h1>
     *          <p>{props.description}</p>
     *          <ProgressText />
     *          <form>{props.children}</form>
     *         </div>
     *       );
     *     }
     *   }
     *  }
     * })
     * ```
     * ### Without custom props
     * ```tsx
     * const schema = defineMultiStepForm({
     *  steps: {
     *    step1: {
     *      title: 'Step 1',
     *      fields: {
     *        firstName: {
     *          defaultValue: ''
     *       }
     *     }
     *   },
     *   form: {
     *    alias: 'MyCustomForm',
     *    render(context) {
     *      // return custom form here
     *     }
     *   }
     *  }
     * })
     * ```
     */
    render: (
      context: renderContext<renderContextSteps<value>>,
      customProps: customProps,
    ) => ReactNode;
  }

  export function instantiateFormConfig<
    const def extends StepSchema.Config,
    value extends instantiateReactSteps<def>,
  >(
    getSteps: () => value,
    subscribe: (listener: () => void) => () => void,
    availableSteps: readonly StepNumbers<value>[],
  ) {
    return <
      const form extends FormConfig<def, value>,
      inst = instantiateFormConfig<form>,
    >(
      config: form | undefined,
      defaultId: string,
    ) => {
      const defaults = {
        alias: DEFAULT_FORM_ALIAS,
        enabledForSteps: 'all',
        props: undefined,
      };

      if (!config) {
        return defaults as inst;
      }

      const {
        alias = defaults.alias,
        enabledForSteps = defaults.enabledForSteps,
        render,
        id,
      } = config;
      if (id) {
        InvalidFormConfigError.invariant(typeof id === 'string', {
          reason: 'The id must be a string',
          property: 'id',
          value: id,
          expected: 'string',
        });
      }

      if (alias) {
        InvalidFormConfigError.invariant(typeof alias === 'string', {
          reason: 'The alias must be a string',
          property: 'alias',
          value: alias,
          expected: 'string',
        });
      }

      if (enabledForSteps) {
        const availableStepsArray = Array.from(availableSteps);

        InvalidFormConfigError.invariant(
          HelperFnChosenSteps.isValid(enabledForSteps, availableStepsArray),
          {
            reason: HelperFnChosenSteps.createCatchAllMessage(
              availableStepsArray,
              'enabledFor',
            ),
            property: 'enabledForSteps',
            value: enabledForSteps,
            expected: availableStepsArray,
          },
        );
      }

      InvalidFormConfigError.invariant(typeof render === 'function', {
        reason: 'The render must be a function',
        property: 'render',
        value: render,
        expected: 'function',
      });

      function Form(customProps: inferFormProps<form>) {
        const resolvedSteps = useSyncExternalStore(
          subscribe,
          getSteps,
          getSteps,
        );
        const steps = createRenderSteps(
          resolvedSteps,
        ) as renderContextSteps<value>;

        function isStepComplete(targetStep: string) {
          const validSteps = Object.keys(steps);

          InvalidStepError.invariant(validSteps.includes(targetStep), {
            reason: 'Invalid step number',
            targetStep,
            validSteps,
          });

          const step = steps[targetStep as keyof typeof steps] as unknown as {
            isComplete: () => boolean;
          };

          return step.isComplete();
        }

        function getCurrentStepData(options: {
          targetStep: string;
          isDataGuaranteed?: boolean;
          notFoundMessage?: (
            context: { targetStep: string },
            props: never,
          ) => ReactNode;
        }) {
          const { targetStep, isDataGuaranteed, notFoundMessage } = options;
          const validSteps = Object.keys(steps);

          // Static types protect TypeScript callers, while this guard keeps dynamic and
          // JavaScript callers aligned with the other render-context step helpers.
          InvalidStepError.invariant(validSteps.includes(targetStep), {
            reason: 'Invalid step number',
            targetStep,
            validSteps,
          });

          const data = steps[targetStep as keyof typeof steps];

          function NoCurrentData(props?: defaultRenderProps) {
            if (notFoundMessage) {
              return notFoundMessage({ targetStep }, props as never);
            }

            return (
              <div {...props}>No data found for step {String(targetStep)}</div>
            );
          }

          if (isDataGuaranteed) {
            return {
              data,
              NoCurrentData,
            };
          }

          if (MultiStepFormStepSchema.hasData({ [targetStep]: data })) {
            return {
              data,
              hasData: true,
              NoCurrentData,
            };
          }

          return {
            data: undefined,
            hasData: false,
            NoCurrentData,
          };
        }

        function getProgress(options: {
          targetStep: string;
          totalSteps?: number;
          maxProgressValue?: number;
          progressTextTransformer?: (
            context: {
              targetStep: string;
              totalSteps: number;
              maxProgressValue: number;
            },
            props: never,
          ) => ReactNode;
        }) {
          const {
            targetStep,
            maxProgressValue = 100,
            totalSteps = availableSteps.length,
            progressTextTransformer,
          } = options;
          const validSteps = Object.keys(steps);

          InvalidStepError.invariant(validSteps.includes(targetStep), {
            reason: 'Invalid step number',
            targetStep,
            validSteps,
          });

          const currentStep = targetStep.replace('step', '');
          const value =
            (Number.parseInt(currentStep, 10) / totalSteps) * maxProgressValue;

          function ProgressText(props?: defaultRenderProps) {
            if (progressTextTransformer) {
              return progressTextTransformer(
                { targetStep, maxProgressValue, totalSteps },
                props as never,
              );
            }

            return (
              <div {...props}>
                Step {currentStep}/{totalSteps}
              </div>
            );
          }

          return {
            value,
            maxProgressValue,
            ProgressText,
          };
        }

        return render(
          {
            id: id ?? defaultId,
            steps: steps as unknown as renderContext<
              renderContextSteps<value>
            >['steps'],
            getCurrentStepData,
            getProgress,
            isStepComplete,
          } as unknown as renderContext<renderContextSteps<value>>,
          customProps,
        );
      }

      return {
        alias,
        enabledForSteps,
        [alias]: Form,
      } as inst;
    };
  }

  /**
   * Compares {@linkcode enabledFor} to the {@linkcode target} to determine if the form
   * should be available.
   * @param target The target steps the form _should_ be available for.
   * @param enabledFor The steps that the form _is_ enabled for.
   * @returns A boolean representing if the form should be available.
   */
  // Note: the implementation is specific to `MultiStepFormStepSchema.createComponentForStep`
  // because the `target` will always be an `Array` in `MultiStepFormStepSchema.createComponentForStep`.
  // TODO add validation to keys
  export function isFormAvailable<
    value extends instantiateReactSteps,
    target extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    enabledFor extends formEnabledFor<value>,
  >(target: target, enabledFor: enabledFor) {
    if (Array.isArray(target)) {
      const match = HelperFnChosenSteps.match({
        meta: {
          target,
        },
        default: () => false,
        all: () => true,
        tuple: ({ chosenSteps, meta }) => {
          return chosenSteps.some((key) => meta.target.includes(key));
        },
        object: ({ chosenSteps, meta }) => {
          return Object.keys(chosenSteps).some((key) =>
            meta.target.includes(key as StepNumbers<value>),
          );
        },
      });

      return match<value, enabledFor>(enabledFor);
    }

    return false;
  }

  /**
   * Creates a form component with a default id.
   * @param id The default id for the form.
   * @returns A form component with a default {@linkcode id}.
   */
  export function createDefaultForm(id: string) {
    return (props: Omit<ComponentPropsWithRef<'form'>, 'id'>) => (
      <form id={id} {...props} />
    );
  }
}
