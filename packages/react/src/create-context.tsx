import {
  createInvariant,
  MultiStepFormStepSchema,
  type Invariant,
  type steps,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import { type ComponentProps, type ReactNode } from 'react';
import {
  createMultiStepFormDataHook,
  UseMultiStepFormData,
} from './hooks/use-multi-step-form-data';
import { MultiStepFormSchema } from './schema';
import type { CreatedMultiStepFormComponent, CreateFunction } from './utils';

type BaseOptions<targetStep extends string> = {
  /**
   * The step to return data from.
   */
  targetStep: targetStep;
};
export type UseCurrentStepOptions<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
  targetStep extends steps.StepNumbers<value>,
  props,
  isDataGuaranteed extends boolean = false,
> = BaseOptions<targetStep> & {
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
    [ctx: BaseOptions<targetStep>, props: props],
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
export interface UseCurrentStepErrorResult<
  TData = unknown,
  TProps = undefined,
> extends UseCurrentStepBaseResult<TData, TProps> {
  data: undefined;
  hasData: false;
}
export interface UseCurrentStepSuccessResult<
  TData = unknown,
  TProps = undefined,
> extends UseCurrentStepBaseResult<TData, TProps> {
  data: TData;
  hasData: true;
}
export type UseCurrentStepResult<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
  targetStep extends steps.StepNumbers<value>,
  props,
  isDataGuaranteed extends boolean = false,
> = isDataGuaranteed extends true
  ? Omit<
      UseCurrentStepSuccessResult<steps.getCurrent<value, targetStep>, props>,
      'hasData'
    >
  :
      | UseCurrentStepErrorResult<steps.getCurrent<value, targetStep>, props>
      | UseCurrentStepSuccessResult<steps.getCurrent<value, targetStep>, props>;
export type UseProgressBaseOptions<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
  targetStep extends steps.StepNumbers<value>,
> = BaseOptions<targetStep> & {
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
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
  targetStep extends steps.StepNumbers<value>,
  props,
> = UseProgressBaseOptions<def, value, targetStep> & {
  /**
   * An optional transformation function to provide a custom progress text.
   */
  progressTextTransformer?: CreateFunction<
    [ctx: Required<UseProgressBaseOptions<def, value, targetStep>>, props],
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

export type MultiStepFormContextResult<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
> = {
  useMultiStepFormData: UseMultiStepFormData<def, value>;
  /**
   * Gets the data for the specified step.
   *
   * @returns The data for the given step number.
   */
  useCurrentStepData: <
    targetStep extends steps.StepNumbers<value>,
    props = undefined,
    isDataGuaranteed extends boolean = false,
  >(
    options: UseCurrentStepOptions<
      def,
      value,
      targetStep,
      props,
      isDataGuaranteed
    >
  ) => UseCurrentStepResult<def, value, targetStep, props, isDataGuaranteed>;
  useProgress: <targetStep extends steps.StepNumbers<value>, props = undefined>(
    options: UseProgressOptions<def, value, targetStep, props>
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
  withProgressText: <
    targetStep extends steps.StepNumbers<value>,
    props = undefined,
  >(
    options: UseProgressBaseOptions<def, value, targetStep>,
    cb: (
      ctx: Required<UseProgressBaseOptions<def, value, targetStep>>,
      props: props
    ) => ReactNode
  ) => CreatedMultiStepFormComponent<props>;
  /**
   * A HOC for creating a custom not found component for when a step's data is `undefined`.
   * @param options Options for creating the HOC.
   * @param cb The callback function for creating the HOC.
   * @returns A HOC for the `notFoundMessage` option of the `useCurrentStep` hook.
   */
  withNoStepDataFound: <
    targetStep extends steps.StepNumbers<value>,
    props = undefined,
  >(
    options: BaseOptions<targetStep>,
    cb: (ctx: BaseOptions<targetStep>, props: props) => ReactNode
  ) => CreatedMultiStepFormComponent<props>;
};

function createComponent<ctx>(ctx: ctx) {
  return function <props>(fn: CreateFunction<[ctx, props], ReactNode>) {
    return ((props: props) =>
      fn(ctx, props)) as CreatedMultiStepFormComponent<props>;
  };
}

export function createMultiStepFormContext<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
>(
  schema: MultiStepFormSchema<def, value>
): MultiStepFormContextResult<def, value> {
  const useMultiStepFormData = createMultiStepFormDataHook(schema);

  function useCurrentStepData<
    targetStep extends steps.StepNumbers<value>,
    props = undefined,
    isDataGuaranteed extends boolean = false,
  >(
    options: UseCurrentStepOptions<
      def,
      value,
      targetStep,
      props,
      isDataGuaranteed
    >
  ): UseCurrentStepResult<def, value, targetStep, props, isDataGuaranteed> {
    const { targetStep, notFoundMessage, isDataGuaranteed } = options;
    const data = useMultiStepFormData({
      targetStep,
    });
    const NoDataFoundComponent = notFoundMessage
      ? withNoStepDataFound({ targetStep }, notFoundMessage)
      : (props: Omit<ComponentProps<'div'>, 'children'>) => (
          <div {...props}>No data found for step {String(targetStep)}</div>
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

  function useProgress<
    targetStep extends steps.StepNumbers<value>,
    props = undefined,
  >(
    options: UseProgressOptions<def, value, targetStep, props>
  ): UseProgressResult<props> {
    const steps = useMultiStepFormData(
      (data) => data.stepSchema.steps.value.length
    );
    const {
      targetStep,
      maxProgressValue = 100,
      totalSteps = steps,
      progressTextTransformer,
    } = options;
    const invariant: Invariant = createInvariant('[useProgress]');

    invariant(
      schema.getSnapshot().stepSchema.steps.isValidStep(targetStep),
      'Invalid step number'
    );

    const currentStep = targetStep.replace('step', '');
    const value =
      (Number.parseInt(currentStep, 10) / totalSteps) * maxProgressValue;
    const ProgressText = progressTextTransformer
      ? withProgressText(
          { targetStep, maxProgressValue, totalSteps },
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

  function withProgressText<
    targetStep extends steps.StepNumbers<value>,
    props = undefined,
  >(
    options: UseProgressBaseOptions<def, value, targetStep>,
    cb: (
      ctx: Required<UseProgressBaseOptions<def, value, targetStep>>,
      props: props
    ) => ReactNode
  ) {
    const steps = schema.getSnapshot().stepSchema.steps.value.length;
    const { targetStep, maxProgressValue = 100, totalSteps = steps } = options;

    return createComponent({ targetStep, maxProgressValue, totalSteps })(cb);
  }

  function withNoStepDataFound<
    targetStep extends steps.StepNumbers<value>,
    props = undefined,
  >(
    options: BaseOptions<targetStep>,
    cb: (ctx: BaseOptions<targetStep>, props: props) => ReactNode
  ) {
    const { steps } = schema.getSnapshot().stepSchema;
    const invariant: Invariant = createInvariant('[withNoStepDataFound]');

    invariant(
      steps.isValidStep(options.targetStep),
      (formatter) =>
        `Invalid step number "${options.targetStep}". Valid steps are: ${formatter.format(steps.as('array.string.untyped'))}`
    );

    return createComponent({ targetStep: options.targetStep })(cb);
  }

  return {
    useMultiStepFormData,
    useCurrentStepData,
    useProgress,
    useCanRestartForm,
    withProgressText,
    withNoStepDataFound,
  };
}
