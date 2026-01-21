import type { steps } from '@/steps/steps';
import type {
  Expand,
  IsString,
  RequireAtLeastOne,
  stripFunctions,
} from '@/utils';

export * from './utils';
export namespace HelperFnChosenSteps {
  export type defaultStringOption = 'all';
  export type stringOption<T extends string> = defaultStringOption | T;
  export type tupleNotation<T extends string> = [T, ...T[]];
  export type objectNotation<T extends string> = RequireAtLeastOne<{
    [_ in T]: true;
  }>;

  export type build<
    value extends string,
    stringOptions = defaultStringOption
  > = stringOptions | tupleNotation<value> | objectNotation<value>;
  export type main<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>
  > = build<stepNumbers>;
  export type resolveAll<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  > = chosenSteps extends 'all' ? steps.StepNumbers<value> : never;
  export type resolveTuple<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  > = chosenSteps extends tupleNotation<steps.StepNumbers<value>>
    ? chosenSteps[number] extends steps.StepNumbers<value>
      ? chosenSteps[number]
      : never
    : never;
  export type resolveObject<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  > = chosenSteps extends objectNotation<steps.StepNumbers<value>>
    ? steps.StepNumbers<value> extends keyof chosenSteps
      ? steps.StepNumbers<value>
      : never
    : never;
  export type resolve<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  > =
    | resolveAll<value, chosenSteps>
    | resolveTuple<value, chosenSteps>
    | resolveObject<value, chosenSteps>;
  export type resolveType<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  > = chosenSteps extends 'all'
    ? 'all'
    : chosenSteps extends tupleNotation<steps.StepNumbers<value>>
    ? 'tuple'
    : chosenSteps extends objectNotation<steps.StepNumbers<value>>
    ? 'object'
    : never;

  export type currentStep<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  > = value[resolve<value, chosenSteps>];

  export function createCatchAllMessage(
    availableSteps: string[],
    type: 'chosen' | 'enabledFor' = 'chosen'
  ) {
    const formatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'disjunction',
    });

    return `The ${type} steps must either be set to on of the following: "all", an array of steps (${formatter.format(
      availableSteps.map((step) => `"${step}"`)
    )}), or an object containing the steps to chose ({ ${availableSteps
      .map((step) => `${step}: true`)
      .join(', ')} })`;
  }

  export function isAll(value: unknown): value is defaultStringOption {
    return Boolean(value && typeof value === 'string' && value === 'all');
  }

  export function isTuple<t>(
    value: unknown
  ): value is tupleNotation<steps.StepNumbers<t>>;
  export function isTuple<def, steps extends steps.instantiateSteps<def>>(
    value: unknown,
    validValues?: Array<unknown>
  ): value is tupleNotation<steps.StepNumbers<steps>>;
  export function isTuple(value: unknown, validValues?: Array<unknown>) {
    if (!Array.isArray(value)) {
      return false;
    }

    if (validValues) {
      return value.every((key) => validValues.includes(key));
    }

    return true;
  }

  export function isObject<def, steps extends steps.instantiateSteps<def>>(
    value: unknown,
    validKeys?: Array<unknown>
  ): value is objectNotation<steps.StepNumbers<steps>> {
    if (!value) {
      return false;
    }

    const keys = Object.keys(value);

    if (keys.length === 0) {
      return false;
    }

    if (validKeys && !keys.every((key) => validKeys.includes(key))) {
      return false;
    }

    return Object.entries(value).every(([_, v]) => v === true);
  }

  export function isValid<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  >(value: unknown, validValues?: Array<string>): value is chosenSteps {
    if (isAll(value)) {
      return true;
    }

    if (isTuple(value, validValues)) {
      return true;
    }

    if (isObject(value, validValues)) {
      return true;
    }

    return false;
  }

  export function resolveType<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  >(chosenSteps: chosenSteps, validValues?: Array<string>) {
    if (isAll(chosenSteps)) {
      return 'all';
    }

    if (isTuple(chosenSteps, validValues)) {
      return 'tuple';
    }

    if (isObject(chosenSteps, validValues)) {
      return 'object';
    }

    throw new Error(
      'Unable to resolve the type of the chosen steps. Valid values are: "all", an array of steps, or an object containing the steps to chose.'
    );
  }

  export interface MatchContextBase {
    /**
     * The chosen steps.
     */
    chosenSteps: main<
      steps.instantiateSteps,
      steps.StepNumbers<steps.instantiateSteps>
    >;
  }
  export interface AllMatchContext extends MatchContextBase {
    chosenSteps: 'all';
  }
  export interface TupleMatchContext extends MatchContextBase {
    chosenSteps: tupleNotation<steps.StepNumbers<steps.instantiateSteps>>;
  }
  export interface ObjectMatchContext extends MatchContextBase {
    chosenSteps: objectNotation<steps.StepNumbers<steps.instantiateSteps>>;
  }
  export type MatchContextWithMeta<meta extends Record<string, unknown>> = [
    meta
  ] extends [never]
    ? {}
    : {
        /**
         * Meta data that's available in the match function.
         */
        meta: meta;
      };
  export type MatchContextWithValidValues<validValues extends Array<string>> = [
    validValues
  ] extends [never]
    ? {}
    : validValues extends Array<infer value>
    ? value extends string
      ? {
          /**
           * The values that the tuple or object keys can be.
           */
          validValues: validValues;
        }
      : {}
    : {};
  export type MatchContext<
    meta extends Record<string, unknown>,
    validValues extends Array<string>,
    additionalCtx = {}
  > = Expand<
    MatchContextWithMeta<meta> &
      MatchContextWithValidValues<validValues> &
      additionalCtx
  >;
  export type MatchHandlerWithoutValidValues<
    meta extends Record<string, unknown>,
    ret = void
  > = [meta] extends [never]
    ? () => ret
    : (context: MatchContext<meta, never>) => ret;
  export type DefaultMatchContext<
    meta extends Record<string, unknown>,
    validValues extends Array<string>
  > = MatchContext<
    meta,
    validValues,
    MatchContextBase &
      ([validValues] extends [never]
        ? {}
        : {
            /**
             * A detailed error message that includes all ways to match the chosen steps.
             *
             * This is derived from {@linkcode createCatchAllMessage}.
             */
            errorMessage: string;
          })
  >;
  export type DefaultMatchHandler<
    meta extends Record<string, unknown>,
    validValues extends Array<string>,
    ret = void
  > = (context: DefaultMatchContext<meta, validValues>) => ret;
  export type MatchHandler<
    meta extends Record<string, unknown>,
    validValues extends Array<string>,
    ret = void
  > = (context: MatchContext<meta, validValues>) => ret;
  type AllMatchHandler<
    meta extends Record<string, unknown>,
    validValues extends Array<string>,
    ret = void
  > = (context: MatchContext<meta, validValues, AllMatchContext>) => ret;
  type TupleMatchHandler<
    meta extends Record<string, unknown>,
    validValues extends Array<string>,
    ret = void
  > = (context: MatchContext<meta, validValues, TupleMatchContext>) => ret;
  type ObjectMatchHandler<
    meta extends Record<string, unknown>,
    validValues extends Array<string>,
    ret = void
  > = (context: MatchContext<meta, validValues, ObjectMatchContext>) => ret;
  export type MatchOptions<
    meta extends Record<string, unknown> = never,
    validValues extends Array<string> = never,
    ret = void,
    defaultMatch = void
  > = {
    /**
     * Optionally provide data that will be available in the match functions.
     */
    meta?: meta;
    /**
     * Optionally provide valid values that will be used to validate the chosen steps.
     *
     * Note: if provided, the values will be used to match against `tuple` and `object` handlers.
     */
    validValues?: MatchHandlerWithoutValidValues<meta, validValues>;
    /**
     * A function to match against when the chosen steps are set to `'all'`.
     * @param meta The meta data to match against.
     * @returns
     */
    all?: AllMatchHandler<meta, validValues, ret>;
    /**
     * A function to match against when the chosen steps are set to a tuple.
     * @param meta The meta data to match against.
     * @returns
     */
    tuple?: TupleMatchHandler<meta, validValues, ret>;
    /**
     * A function to match against when the chosen steps are set to an object.
     * @param meta The meta data to match against.
     * @returns
     */
    object?: ObjectMatchHandler<meta, validValues, ret>;
    /**
     * The default handler to match against when no other handler matches.
     */
    default: DefaultMatchHandler<meta, validValues, defaultMatch>;
  };
  export type inferMatch<reg, defaultMatch> = [defaultMatch] extends [never]
    ? reg
    : reg | defaultMatch;

  export function match<
    meta extends Record<string, unknown> = never,
    validValues extends Array<string> = never,
    ret = void,
    defaultMatch = void
  >(options: MatchOptions<meta, validValues, ret, defaultMatch>) {
    const { meta, validValues, default: defaultHandler, ...handlers } = options;

    return <
      value extends steps.instantiateSteps,
      chosenSteps extends main<value, steps.StepNumbers<value>>
    >(
      chosenSteps: chosenSteps
    ) => {
      let context: Record<string, unknown> = { chosenSteps };
      let defaultContext: Record<string, unknown> = context;

      if (meta) {
        context = { ...context, meta };
      }

      if (validValues) {
        context = { ...context, validValues };
      }

      const values = validValues?.(context as never);

      if (values) {
        defaultContext = {
          ...defaultContext,
          errorMessage: createCatchAllMessage(values),
        };
      }

      const type = resolveType<value, chosenSteps>(chosenSteps, values);
      const handler = handlers[type];

      return (
        handler?.(context as never) ??
        (defaultHandler(defaultContext as never) as inferMatch<
          ret,
          defaultMatch
        >)
      );
    };
  }

  export function createTupleNotation<T extends string>(...values: T[]) {
    const [value, ...rest] = values;

    return [value, ...rest] as tupleNotation<T>;
  }
}

export namespace HelperFn {
  export type buildAllCtx<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    omitSteps extends HelperFnChosenSteps.resolve<value, chosenSteps>
  > = Expand<
    Omit<
      {
        [key in steps.StepNumbers<value>]: stripFunctions<
          steps.getCurrent<value, key>
        >;
      },
      IsString<omitSteps>
    >
  >;
  export type buildTupleCtx<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    omitSteps extends HelperFnChosenSteps.resolve<value, chosenSteps>
  > = chosenSteps extends HelperFnChosenSteps.tupleNotation<
    steps.StepNumbers<value>
  >
    ? Expand<
        Omit<
          {
            -readonly [key in chosenSteps[number]]: key extends steps.StepNumbers<value>
              ? stripFunctions<steps.getCurrent<value, key>>
              : never;
          },
          IsString<omitSteps>
        >
      >
    : never;
  export type buildObjectCtx<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    omitSteps extends HelperFnChosenSteps.resolve<value, chosenSteps>
  > = chosenSteps extends HelperFnChosenSteps.objectNotation<
    steps.StepNumbers<value>
  >
    ? Expand<
        Omit<
          {
            [key in keyof chosenSteps]: key extends steps.StepNumbers<value>
              ? stripFunctions<steps.getCurrent<value, key>>
              : never;
          },
          IsString<omitSteps>
        >
      >
    : never;
  type CtxMap<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    omitSteps extends HelperFnChosenSteps.resolve<value, chosenSteps>
  > = {
    all: buildAllCtx<value, chosenSteps, omitSteps>;
    tuple: buildTupleCtx<value, chosenSteps, omitSteps>;
    // tuple: buildTupleCtx<value, chosenSteps, omitSteps>;
    object: buildObjectCtx<value, chosenSteps, omitSteps>;
  };
  export type buildCtx<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    omitSteps extends HelperFnChosenSteps.resolve<value, chosenSteps> = never
  > = CtxMap<value, chosenSteps, omitSteps>[HelperFnChosenSteps.resolveType<
    value,
    chosenSteps
  >];
  export interface BaseOptions<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  > {
    /**
     * The step data to use for the function. It can either be an array with the **available**
     * step numbers or `'all'`.
     *
     * - If set to `'all'`, data from **all** the steps will be available.
     * - If an array of the **available** step numbers is provided, only data from those steps will be available.
     */
    stepData: chosenSteps;
  }
  export interface BaseInput<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    omitSteps extends HelperFnChosenSteps.resolve<value, chosenSteps> = never,
    TAdditionalCtx extends Record<string, unknown> = {}
  > {
    /**
     * The multi-step form step context.
     */
    ctx: Expand<buildCtx<value, chosenSteps, omitSteps> & TAdditionalCtx>;
  }
  export interface CtxDataSelector<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    TAdditionalCtx extends Record<string, unknown> = {}
  > {
    /**
     * A function to select the data that will be available in the `fn`'s ctx.
     * @param input The available input to create the context with.
     * @returns The created ctx.
     */
    ctxData?: (
      input: BaseInput<
        value,
        'all',
        HelperFnChosenSteps.resolve<value, chosenSteps>
      >
    ) => TAdditionalCtx;
  }
}
export type createStepSpecificHelperFn<
  value extends steps.instantiateSteps,
  chosenSteps extends HelperFnChosenSteps.main<value, steps.StepNumbers<value>>
> = HelperFnChosenSteps.resolve<value, chosenSteps>;
