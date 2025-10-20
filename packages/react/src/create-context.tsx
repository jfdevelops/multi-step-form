import { type casing } from '@multi-step-form/casing';
import type { types } from '@multi-step-form/compile-time-utils';
import type { MultiStepFormSchemaOptions } from '@multi-step-form/core';
import { invariant } from '@multi-step-form/runtime-utils';
import type {
  DefaultCasing,
  GetCurrentStep,
  InferStepOptions,
  Step,
  StepNumbers,
} from '@multi-step-form/shared-utils';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react';
import type { JSX } from 'react/jsx-runtime';
import { createMultiStepFormSchema, MultiStepFormSchema } from './schema';
import {
  MultiStepFormStepSchema,
  type CreatedMultiStepFormComponent,
  type CreateFunction,
  type ResolvedStep,
} from './step-schema';

export type UseMultiStepFormData<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType,
  storageKey extends string,
  schema extends MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  > = MultiStepFormSchema<step, resolvedStep, stepNumbers, casing, storageKey>
> = {
  /**
   * Returns the entire {@linkcode MultiStepFormSchema instance}.
   */
  (): schema;
  /**
   * Returns the data for the target step.
   * @param stepNumber The step number to return.
   * @throws {TypeError} If `options.stepNumber` is invalid.
   */
  <stepNumber extends stepNumbers>(options: {
    stepNumber: stepNumber;
  }): GetCurrentStep<resolvedStep, stepNumber>;
  /**
   * Returns the specified data from the {@linkcode MultiStepFormSchema} instance via the callback's return.
   */
  <data>(selector: (schema: schema) => data): data;
};

export type UseCurrentStepOptions<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType,
  stepNumber extends stepNumbers,
  props,
  isDataGuaranteed extends boolean = false
> = {
  /**
   * The step to return data from.
   */
  stepNumber: stepNumber;
  /**
   * Determines if the result should follow "strictness".
   * The result will change based on the value for this option.
   *
   * - `true`: `data` is **defined** and `hasData` isn't available.
   * - `false`: `data` _can be_ `undefined`, but the `hasData` property is available
   * to help with type narrowing.
   *
   * @default false
   * @example
   * ### `true`
   * ```tsx
   * function MyComponent() {
   *  const { data, NoCurrentData } = useCurrentStep({
   *    stepNumber: 1,
   *    isDataGuaranteed: true,
   *  })
   *
   * // Notice how `NoCurrentData` is still available
   * // Do things with `data` here
   * }
   * ```
   *
   * ### `false` - The default
   * ```tsx
   * function MyComponent() {
   *  const { data, NoCurrentData, hasData } = useCurrentStep({
   *    stepNumber: 1,
   *  })
   *
   *  if (!hasData) {
   *    return <NoCurrentData />
   *  }
   *
   * // Do things with `data` here
   * }
   * ```
   */
  isDataGuaranteed?: isDataGuaranteed;
  /**
   * An optional transformation function to provide a custom not found message.
   */
  notFoundMessage?: CreateFunction<
    [ctx: { stepNumber: stepNumber }, props: props],
    ReactNode
  >;
};
export interface UseCurrentStepBaseResult<TData = unknown, TProps = undefined> {
  /**
   * The current step's data.
   */
  data: TData | undefined;
  /**
   * Boolean indicating if the current step has data.
   */
  hasData: boolean;
  /**
   * Component to render some sort of error if `data` isn't defined.
   */
  NoCurrentData: CreatedMultiStepFormComponent<
    TProps extends undefined ? Omit<ComponentProps<'div'>, 'children'> : TProps
  >;
}
export interface UseCurrentStepErrorResult<TData = unknown, TProps = undefined>
  extends UseCurrentStepBaseResult<TData, TProps> {
  data: undefined;
  hasData: false;
}
export interface UseCurrentStepSuccessResult<
  TData = unknown,
  TProps = undefined
> extends UseCurrentStepBaseResult<TData, TProps> {
  data: TData;
  hasData: true;
}
export type UseCurrentStepResult<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType,
  stepNumber extends stepNumbers,
  props,
  isDataGuaranteed extends boolean = false
> = isDataGuaranteed extends true
  ? Omit<
      UseCurrentStepSuccessResult<
        GetCurrentStep<resolvedStep, stepNumber>,
        props
      >,
      'hasData'
    >
  :
      | UseCurrentStepErrorResult<
          GetCurrentStep<resolvedStep, stepNumber>,
          props
        >
      | UseCurrentStepSuccessResult<
          GetCurrentStep<resolvedStep, stepNumber>,
          props
        >;
export type UseProgressBaseOptions<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType,
  stepNumber extends stepNumbers
> = {
  /**
   * The current step of the form.
   */
  currentStep: stepNumber;
  /**
   * The total amount of steps that are in the form.
   *
   * @default schema.stepData.steps.value.length
   */
  totalSteps?: number;
  /**
   * The highest value the progress indicator should go.
   *
   * @default 100
   */
  maxProgressValue?: number;
};
export type UseProgressOptions<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType,
  stepNumber extends stepNumbers,
  props
> = UseProgressBaseOptions<
  step,
  resolvedStep,
  stepNumbers,
  casing,
  stepNumber
> & {
  /**
   * An optional transformation function to provide a custom progress text.
   */
  progressTextTransformer?: CreateFunction<
    [
      ctx: Required<
        UseProgressBaseOptions<
          step,
          resolvedStep,
          stepNumbers,
          casing,
          stepNumbers
        >
      >,
      props
    ],
    ReactNode
  >;
};
export type UseProgressResult<props> = {
  /**
   * The value of the progress indicator.
   */
  value: number;
  /**
   * The highest value the progress indicator can be.
   *
   * @default 100
   */
  maxProgressValue: number;
  ProgressText: CreatedMultiStepFormComponent<
    props extends undefined ? Omit<ComponentProps<'div'>, 'children'> : props
  >;
};
export type CreateHOC<TContext, TProps> = (
  ctx: TContext,
  props: TProps
) => CreatedMultiStepFormComponent<TProps>;
export type MultiStepFormContext<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType = DefaultCasing,
  storageKey extends string = 'MultiStepForm',
  schema extends MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  > = MultiStepFormSchema<step, resolvedStep, stepNumbers, casing, storageKey>
> = {
  MultiStepFormContext: schema;
  MultiStepFormProvider: (props: {
    children: (data: schema) => ReactNode;
  }) => JSX.Element;
  useMultiStepFormData: UseMultiStepFormData<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >;
  /**
   * Gets the data for the specified step.
   *
   * @returns The data for the given step number.
   */
  useCurrentStep: <
    stepNumber extends stepNumbers,
    props = undefined,
    isDataGuaranteed extends boolean = false
  >(
    options: UseCurrentStepOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber,
      props,
      isDataGuaranteed
    >
  ) => UseCurrentStepResult<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    stepNumber,
    props,
    isDataGuaranteed
  >;
  useProgress: <stepNumber extends stepNumbers, props = undefined>(
    options: UseProgressOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber,
      props
    >
  ) => UseProgressResult<props>;
  /**
   * A hook that can be used to check if the form can be restarted. If no {@linkcode cb}
   * is provided, the return value will be dictated by if there is an object stored in
   * {@link MultiStepFormSchema#storage}.
   * @param cb A callback function to provide custom logic for if the form can restart.
   * @returns A boolean indicating if the form can restart.
   */
  useCanRestartForm: (cb?: (canRestart: boolean) => boolean) => boolean;
  /**
   * A HOC for creating a custom progress text for `useProgress`.
   * @param options Options for creating the HOC.
   * @param cb The callback function for creating the HOC.
   * @returns A HOC for the `progressTextTransformer` option of the `useProgress` hook.
   */
  withProgressText: <stepNumber extends stepNumbers, props = undefined>(
    options: UseProgressBaseOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber
    >,
    cb: (
      ctx: Required<
        UseProgressBaseOptions<
          step,
          resolvedStep,
          stepNumbers,
          casing,
          stepNumbers
        >
      >,
      props: props
    ) => ReactNode
  ) => Exclude<
    UseProgressOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber,
      props
    >['progressTextTransformer'],
    undefined
  >;
  /**
   * A HOC for creating a custom not found component for when a step's data is `undefined`.
   * @param options Options for creating the HOC.
   * @param cb The callback function for creating the HOC.
   * @returns A HOC for the `notFoundMessage` option of the `useCurrentStep` hook.
   */
  withNoStepDataFound: <stepNumber extends stepNumbers, props = undefined>(
    options: { currentStep: stepNumber },
    cb: (ctx: { currentStep: stepNumber }, props: props) => ReactNode
  ) => Exclude<
    UseCurrentStepOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber,
      props
    >['notFoundMessage'],
    undefined
  >;
};

function createComponent<ctx>(ctx: ctx) {
  return function <props>(fn: CreateFunction<[ctx, props], ReactNode>) {
    return ((props: props) =>
      fn(ctx, props)) as CreatedMultiStepFormComponent<props>;
  };
}

/**
 * Create multi step form context with a {@linkcode MultiStepFormSchema} instance.
 * @param schema The {@linkcode MultiStepFormSchema} instance.
 */
export function createMultiStepFormContext<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType = DefaultCasing,
  storageKey extends string = 'MultiStepForm'
>(
  schema: MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >
): MultiStepFormContext<step, resolvedStep, stepNumbers, casing, storageKey>;
/**
 * Create multi step form context without a {@linkcode MultiStepFormSchema} instance.
 *
 * The {@linkcode MultiStepFormSchema} instance is returned.
 * @param options Options to create a new instance of {@linkcode MultiStepFormSchema}.
 */
export function createMultiStepFormContext<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType = DefaultCasing,
  storageKey extends string = 'MultiStepForm'
>(
  options: MultiStepFormSchemaOptions<
    step,
    types.Constrain<casing, casing.CasingType>,
    storageKey
  >
): MultiStepFormContext<step, resolvedStep, stepNumbers, casing, storageKey> & {
  schema: MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >;
};
export function createMultiStepFormContext<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType = DefaultCasing,
  storageKey extends string = 'MultiStepForm'
>(
  schemaOrOptions:
    | MultiStepFormSchema<step, resolvedStep, stepNumbers, casing, storageKey>
    | MultiStepFormSchemaOptions<
        step,
        types.Constrain<casing, casing.CasingType>,
        storageKey
      >
): any {
  const isInstance = schemaOrOptions instanceof MultiStepFormSchema;
  const schema: MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  > = isInstance ? schemaOrOptions : createMultiStepFormSchema(schemaOrOptions);
  const Context = createContext(schema);

  function Provider({
    children,
  }: {
    children: (
      data: MultiStepFormSchema<
        step,
        resolvedStep,
        stepNumbers,
        casing,
        storageKey
      >
    ) => ReactNode;
  }) {
    const [state, setState] = useState(schemaOrOptions);
    const store = useMemo(() => {
      const proxy = Object.assign(
        Object.create(Object.getPrototypeOf(state)),
        state
      ) as MultiStepFormSchema<
        step,
        resolvedStep,
        stepNumbers,
        casing,
        storageKey
      >;

      // TODO proxy.update

      return proxy;
    }, [state]);

    return <Context.Provider value={store}>{children(store)}</Context.Provider>;
  }

  function throwIfInvalidStepNumber(
    schema: MultiStepFormSchema<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      storageKey
    >,
    stepNumber: number
  ) {
    const formatter = new Intl.ListFormat('en', {
      type: 'disjunction',
      style: 'long',
    });
    const { as, isValidStepNumber } = schema.stepSchema.steps;

    invariant(
      isValidStepNumber(stepNumber),
      `The step number "${stepNumber}" is not a valid step number. Valid step numbers include ${formatter.format(
        as('array.string.untyped')
      )}`,
      TypeError
    );
  }

  function useMultiStepFormData(): MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >;
  function useMultiStepFormData<stepNumber extends stepNumbers>(options: {
    stepNumber: stepNumber;
  }): GetCurrentStep<resolvedStep, stepNumber>;
  function useMultiStepFormData<data>(
    selector: (
      schema: MultiStepFormSchema<
        step,
        resolvedStep,
        stepNumbers,
        casing,
        storageKey
      >
    ) => data
  ): data;
  function useMultiStepFormData(
    optionsOrSelector?:
      | { stepNumber: stepNumbers }
      | ((
          data: MultiStepFormSchema<
            step,
            resolvedStep,
            stepNumbers,
            casing,
            storageKey
          >
        ) => unknown)
  ) {
    const observer = useContext(Context);

    if (!observer) {
      throw new Error(
        'useMultiStepFormData must be used within MultiStepFormProvider'
      );
    }

    const snapshot = useSyncExternalStore(
      observer.subscribe,
      () => observer.getSnapshot(),
      () => observer.getSnapshot()
    );

    if (typeof optionsOrSelector === 'object') {
      const stepNumber = optionsOrSelector.stepNumber;

      throwIfInvalidStepNumber(snapshot, stepNumber);

      return snapshot.stepSchema.get({ step: stepNumber }).data;
    }

    if (typeof optionsOrSelector === 'function') {
      return optionsOrSelector(snapshot);
    }

    return snapshot;
  }

  function useCurrentStepData<
    stepNumber extends stepNumbers,
    props = undefined,
    isDataGuaranteed extends boolean = false
  >(
    options: UseCurrentStepOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber,
      props,
      isDataGuaranteed
    >
  ): UseCurrentStepResult<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    stepNumber,
    props,
    isDataGuaranteed
  > {
    const { stepNumber, notFoundMessage, isDataGuaranteed } = options;
    const data = useMultiStepFormData({ stepNumber }) as GetCurrentStep<
      resolvedStep,
      stepNumber
    >;
    const NoDataFoundComponent = notFoundMessage
      ? createComponent({ stepNumber })(notFoundMessage)
      : (props: Omit<ComponentProps<'div'>, 'children'>) => (
          <div {...props}>No data found for step {stepNumber}</div>
        );

    if (isDataGuaranteed) {
      return {
        data,
        NoCurrentData: NoDataFoundComponent as never,
      } as never;
    }

    if (MultiStepFormStepSchema.hasData(data)) {
      return {
        data,
        hasData: true,
        NoCurrentData: NoDataFoundComponent as never,
      } as never;
    }

    return {
      data: undefined,
      hasData: false,
      NoCurrentData: NoDataFoundComponent as never,
    } as never;
  }

  function useProgress<stepNumber extends stepNumbers, props = undefined>(
    options: UseProgressOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber,
      props
    >
  ): UseProgressResult<props> {
    const steps = useMultiStepFormData(
      (data) => data.stepSchema.steps.value.length
    );
    const {
      currentStep,
      maxProgressValue = 100,
      totalSteps = steps,
      progressTextTransformer,
    } = options;
    const value = (currentStep / totalSteps) * maxProgressValue;
    const ProgressText = progressTextTransformer
      ? createComponent({ currentStep, maxProgressValue, totalSteps })(
          progressTextTransformer
        )
      : (props: Omit<ComponentProps<'div'>, 'children'>) => (
          <div {...props}>
            Step {currentStep}/{totalSteps}
          </div>
        );

    return {
      value,
      maxProgressValue,
      ProgressText: ProgressText as never,
    };
  }

  function useCanRestartForm(cb?: CreateFunction<[boolean], boolean>) {
    const storage = useMultiStepFormData((data) => data.storage);
    const value = storage.get();
    const canRestart = Boolean(
      value && typeof value === 'object' && Object.keys(value).length > 0
    );

    if (cb) {
      return cb(canRestart);
    }

    return canRestart;
  }

  function withProgressText<stepNumber extends stepNumbers, props>(
    options: UseProgressBaseOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      stepNumber
    >,
    cb: (
      ctx: Required<
        UseProgressBaseOptions<
          step,
          resolvedStep,
          stepNumbers,
          casing,
          stepNumbers
        >
      >,
      props: props
    ) => ReactNode
  ) {
    const steps = schema.getSnapshot().stepSchema.steps.value.length;
    const { currentStep, maxProgressValue = 100, totalSteps = steps } = options;

    return createComponent({ currentStep, maxProgressValue, totalSteps })(cb);
  }

  function withNoStepDataFound<stepNumber extends stepNumbers, props>(
    options: { currentStep: stepNumber },
    cb: (ctx: { currentStep: stepNumber }, props: props) => ReactNode
  ) {
    throwIfInvalidStepNumber(schema, options.currentStep);

    return createComponent(options)(cb);
  }

  return {
    MultiStepFormContext: Context,
    MultiStepFormProvider: Provider,
    useMultiStepFormData,
    useCurrentStepData,
    useProgress,
    useCanRestartForm,
    withProgressText,
    withNoStepDataFound,
    ...(isInstance ? {} : { schema: schema }),
  };
}
