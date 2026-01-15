import type { Expand, IsString, stripFunctions } from '@/utils';
import type { steps } from '../steps';
import type { RequireAtLeastOne } from '../types';

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

  export const CATCH_ALL_MESSAGE =
    'The chosen steps must either be set to on of the following: "all", an array of steps (["step1", "step2", ...]), or an object containing the steps to chose ({ step1: true, step2: true, ...})';

  export function isAll(value: unknown): value is defaultStringOption {
    return Boolean(value && typeof value === 'string' && value === 'all');
  }

  export function isTuple<def, steps extends steps.instantiateSteps<def>>(
    value: unknown,
    validValues?: Array<unknown>
  ): value is tupleNotation<steps.StepNumbers<steps>> {
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

  export function resolveType<
    value extends steps.instantiateSteps,
    chosenSteps extends main<value, steps.StepNumbers<value>>
  >(chosenSteps: chosenSteps) {
    if (isAll(chosenSteps)) {
      return 'all';
    }

    if (isTuple(chosenSteps)) {
      return 'tuple';
    }

    if (isObject(chosenSteps)) {
      return 'object';
    }

    throw new Error(
      'Unable to resolve the type of the chosen steps. Valid values are: "all", an array of steps, or an object containing the steps to chose.'
    );
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
