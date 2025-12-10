import { MultiStepFormStepSchema } from '@jfdevelops/multi-step-form-core';
import { type ComponentProps, type ReactNode } from 'react';
import {
  createMultiStepFormDataHook,
  throwIfInvalidStepNumber,
  UseMultiStepFormData,
} from './hooks/use-multi-step-form-data';
import { MultiStepFormSchema, type AnyMultiStepFormSchema } from './schema';
import type {
  CreatedMultiStepFormComponent,
  CreateFunction,
} from './step-schema';

type BaseOptions<
  TSchema extends AnyMultiStepFormSchema,
  TTargetStep extends keyof MultiStepFormSchema.resolvedStep<TSchema>
> = {
  /**
   * The step to return data from.
   */
  targetStep: TTargetStep;
};
export type UseCurrentStepOptions<
  TSchema extends AnyMultiStepFormSchema,
  TTargetStep extends keyof MultiStepFormSchema.resolvedStep<TSchema>,
  props,
  isDataGuaranteed extends boolean = false
> = BaseOptions<TSchema, TTargetStep> & {
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
    [ctx: BaseOptions<TSchema, TTargetStep>, props: props],
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
  TSchema extends AnyMultiStepFormSchema,
  TTargetStep extends keyof MultiStepFormSchema.resolvedStep<TSchema>,
  props,
  isDataGuaranteed extends boolean = false
> = isDataGuaranteed extends true
  ? Omit<
      UseCurrentStepSuccessResult<
        MultiStepFormSchema.getData<TSchema, TTargetStep>,
        props
      >,
      'hasData'
    >
  :
      | UseCurrentStepErrorResult<
          MultiStepFormSchema.getData<TSchema, TTargetStep>,
          props
        >
      | UseCurrentStepSuccessResult<
          MultiStepFormSchema.getData<TSchema, TTargetStep>,
          props
        >;
export type UseProgressBaseOptions<
  TSchema extends AnyMultiStepFormSchema,
  TTargetStep extends keyof MultiStepFormSchema.resolvedStep<TSchema>
> = BaseOptions<TSchema, TTargetStep> & {
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
  TSchema extends AnyMultiStepFormSchema,
  TTargetStep extends keyof MultiStepFormSchema.resolvedStep<TSchema>,
  props
> = UseProgressBaseOptions<TSchema, TTargetStep> & {
  /**
   * An optional transformation function to provide a custom progress text.
   */
  progressTextTransformer?: CreateFunction<
    [ctx: Required<UseProgressBaseOptions<TSchema, TTargetStep>>, props],
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
  TSchema extends AnyMultiStepFormSchema,
  TResolvedStep extends MultiStepFormSchema.resolvedStep<TSchema> = MultiStepFormSchema.resolvedStep<TSchema>
> = {
  // MultiStepFormContext: schema;
  // MultiStepFormProvider: (props: { children: ReactNode }) => JSX.Element;
  // useMultiStepFormSchema: schema;
  useMultiStepFormData: UseMultiStepFormData<TSchema>;
  /**
   * Gets the data for the specified step.
   *
   * @returns The data for the given step number.
   */
  useCurrentStepData: <
    targetStep extends keyof TResolvedStep,
    props = undefined,
    isDataGuaranteed extends boolean = false
  >(
    options: UseCurrentStepOptions<TSchema, targetStep, props, isDataGuaranteed>
  ) => UseCurrentStepResult<TSchema, targetStep, props, isDataGuaranteed>;
  useProgress: <targetStep extends keyof TResolvedStep, props = undefined>(
    options: UseProgressOptions<TSchema, targetStep, props>
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
  withProgressText: <targetStep extends keyof TResolvedStep, props = undefined>(
    options: UseProgressBaseOptions<TSchema, targetStep>,
    cb: (
      ctx: Required<UseProgressBaseOptions<TSchema, targetStep>>,
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
    targetStep extends keyof TResolvedStep,
    props = undefined
  >(
    options: BaseOptions<TSchema, targetStep>,
    cb: (ctx: BaseOptions<TSchema, targetStep>, props: props) => ReactNode
  ) => CreatedMultiStepFormComponent<props>;
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
// export function createMultiStepFormContext<
//   schema extends AnyMultiStepFormSchema
// >(schema: schema): MultiStepFormContextResult<schema>;
// /**
//  * Create multi step form context without a {@linkcode MultiStepFormSchema} instance.
//  *
//  * The {@linkcode MultiStepFormSchema} instance is returned.
//  * @param options Options to create a new instance of {@linkcode MultiStepFormSchema}.
//  */
// export function createMultiStepFormContext<
//   step extends Step<casing>,
//   casing extends CasingType = DefaultCasing,
//   storageKey extends string = DefaultStorageKey,
//   resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<step, casing>,
//   stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>,
//   schema extends MultiStepFormSchema<
//     step,
//     casing,
//     storageKey,
//     resolvedStep,
//     stepNumbers
//   > = MultiStepFormSchema<step, casing, storageKey, resolvedStep, stepNumbers>
// >(
//   options: MultiStepFormSchemaConfig<
//     step,
//     Constrain<casing, CasingType>,
//     storageKey
//   >
// ): MultiStepFormContextResult<schema> & {
//   schema: MultiStepFormSchema<step, casing, storageKey>;
// };
export function createMultiStepFormContext<
  schema extends AnyMultiStepFormSchema,
  resolvedStep extends MultiStepFormSchema.resolvedStep<schema> = MultiStepFormSchema.resolvedStep<schema>
>(schema: schema): MultiStepFormContextResult<schema> {
  // const isInstance = schemaOrOptions instanceof MultiStepFormSchema;
  // const schema: schema = isInstance
  //   ? schemaOrOptions
  //   : createMultiStepFormSchema(schemaOrOptions);
  // const Context = createContext(schema);

  // function Provider({ children }: { children: ReactNode }) {
  //   const [observer] = useState(() => new MultiStepFormObserver({ schema }));

  //   useEffect(() => {
  //     const unmount = schema.mount();

  //     return () => {
  //       unmount();
  //       observer.destroy();
  //     };
  //   }, [observer]);

  //   return <Context.Provider value={observer}>{children}</Context.Provider>;
  // }

  // function throwIfInvalidStepNumber(
  //   schema: MultiStepFormSchema<step, casing, storageKey>,
  //   stepNumber: number
  // ) {
  //   const formatter = new Intl.ListFormat('en', {
  //     type: 'disjunction',
  //     style: 'long',
  //   });
  //   const { as, isValidStepNumber } = schema.stepSchema.steps;

  //   invariant(
  //     isValidStepNumber(stepNumber),
  //     `The step number "${stepNumber}" is not a valid step number. Valid step numbers include ${formatter.format(
  //       as('array.string.untyped')
  //     )}`,
  //     TypeError
  //   );
  // }

  // @ts-ignore Type instantiation is excessively deep and possibly infinite
  const useMultiStepFormData = createMultiStepFormDataHook(schema);

  function useCurrentStepData<
    targetStep extends keyof resolvedStep,
    props = undefined,
    isDataGuaranteed extends boolean = false
  >(
    options: UseCurrentStepOptions<schema, targetStep, props, isDataGuaranteed>
  ): UseCurrentStepResult<schema, targetStep, props, isDataGuaranteed> {
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
    targetStep extends keyof resolvedStep,
    props = undefined
  >(
    options: UseProgressOptions<schema, targetStep, props>
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
    const currentStep = throwIfInvalidStepNumber(schema, targetStep);
    const value = (currentStep / totalSteps) * maxProgressValue;
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
    targetStep extends keyof resolvedStep,
    props = undefined
  >(
    options: UseProgressBaseOptions<schema, targetStep>,
    cb: (
      ctx: Required<UseProgressBaseOptions<schema, targetStep>>,
      props: props
    ) => ReactNode
  ) {
    const steps = schema.getSnapshot().stepSchema.steps.value.length;
    const { targetStep, maxProgressValue = 100, totalSteps = steps } = options;

    return createComponent({ targetStep, maxProgressValue, totalSteps })(cb);
  }

  function withNoStepDataFound<
    targetStep extends keyof resolvedStep,
    props = undefined
  >(
    options: BaseOptions<schema, targetStep>,
    cb: (ctx: BaseOptions<schema, targetStep>, props: props) => ReactNode
  ) {
    throwIfInvalidStepNumber(schema, options.targetStep);

    return createComponent(options)(cb);
  }

  return {
    // MultiStepFormContext: Context,
    useMultiStepFormData,
    useCurrentStepData,
    useProgress,
    useCanRestartForm,
    withProgressText,
    withNoStepDataFound,
  };
}
