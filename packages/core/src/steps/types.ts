import type { StorageConfig } from '@/storage';
import {
  invariant,
  type CasingType,
  type Constrain,
  type DefaultCasing,
  type DefaultFieldType,
  type Expand,
  type FieldType,
  type objectHelpers,
} from '@/utils';
import type { DeepKeys, path } from '@/utils/path';
import type {
  AnyValidator,
  DefaultValidator,
  ResolveValidatorOutput,
} from '@/utils/validator';

export interface NameTransformCasingOptions<TCasing extends CasingType> {
  /**
   * How the `name` should be transformed for the `label`.
   *
   * If omitted, the default will be whatever is set during {@linkcode MultiStepFormSchema} initialization.
   */
  nameTransformCasing?: Constrain<TCasing, CasingType>;
}
export interface StepFieldOptions<
  Type extends FieldType,
  Casing extends CasingType,
  DefaultValue
> extends NameTransformCasingOptions<Casing> {
  defaultValue: DefaultValue;
  /**
   * The type of the field.
   *
   * @default 'string'
   */
  type?: Type;
  /**
   * The text for the label.
   *
   * If omitted, it will default to the specified casing.
   *
   * If `false`, `label` will be `undefined`, meaning there won't
   * be a label for this field.
   */
  label?: string | false;
}
export type AnyStepFieldOption = StepFieldOptions<
  FieldType,
  CasingType,
  unknown
>;
export type AnyStepField = Record<string, AnyStepFieldOption>;
export interface StepOptions<
  Casing extends CasingType = CasingType,
  TStepField extends AnyStepField = AnyStepField,
  FieldValidator = unknown
> extends NameTransformCasingOptions<Casing> {
  title: string;
  description?: string;
  fields: TStepField;
  /**
   * Validator for the fields.
   */
  validateFields?: Constrain<FieldValidator, AnyValidator, DefaultValidator>;
}
export type Step<
  TCasing extends CasingType = CasingType,
  step extends number = number,
  options extends StepOptions<TCasing, AnyStepField, unknown> = StepOptions<
    TCasing,
    AnyStepField,
    unknown
  >
> = Record<ValidStepKey<step>, options>;
export type AnyStep = Step<any, any, any>;

export type GetFieldsForStep<
  Steps extends InferStepOptions<any>,
  Key extends keyof Steps
> = Steps[Key] extends {
  fields: infer fields extends AnyStepField;
}
  ? fields
  : never;
export type GetDefaultCasingTransformation<
  Step extends InferStepOptions<any>,
  Key extends keyof Step,
  TDefault extends CasingType = DefaultCasing
> = Step[Key] extends { nameTransformCasing: infer casing extends CasingType }
  ? casing
  : TDefault;
export type SetDefault<T, Defaults> = {
  // All the keys from T
  [K in keyof T]-?: K extends keyof Defaults
    ? undefined extends T[K]
      ? Exclude<T[K], undefined> | Defaults[K] // optional -> upgraded with default
      : T[K] // already required, don't touch
    : T[K];
} & {
  // Any defaults not in T get added
  [K in Exclude<keyof Defaults, keyof T>]-?: Defaults[K];
};
export type ResolvedFields<
  TInferredSteps extends InferStepOptions<any>,
  TKey extends keyof TInferredSteps,
  TFields extends GetFieldsForStep<TInferredSteps, TKey> = GetFieldsForStep<
    TInferredSteps,
    TKey
  >
> = {
  [name in keyof TFields]: Expand<
    // current field information for the `name`
    SetDefault<
      TFields[name],
      {
        type: DefaultFieldType;
        nameTransformCasing: GetDefaultCasingTransformation<
          TInferredSteps,
          TKey
        >;
        label: string;
      }
    >
  >;
};
export type ResolvedStepBuilder<
  TStep extends Step,
  TDefaultCasing extends CasingType = DefaultCasing,
  TInferredSteps extends InferStepOptions<TStep> = InferStepOptions<TStep>
> = Expand<{
  [stepKey in keyof TInferredSteps]: Expand<
    SetDefault<
      Omit<TInferredSteps[stepKey], 'fields' | 'validateFields'>,
      {
        type: DefaultFieldType;
        nameTransformCasing: GetDefaultCasingTransformation<
          TInferredSteps,
          stepKey,
          TDefaultCasing
        >;
      }
    > & {
      fields: Expand<ResolvedFields<TInferredSteps, stepKey>>;
    }
  >;
}>;
export type Updater<TInput, TOutput = TInput> =
  | TOutput
  | ((input: TInput) => TOutput);

export namespace UpdateFn {
  export type resolvedStep<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends ValidStepKey<TStepNumbers>
  > = Expand<StrippedResolvedStep<TResolvedStep[TTargetStep], true>>;

  type resolveAllPropertyPath<
    TCurrentStep extends AnyResolvedStep,
    TField extends chosenFields<TCurrentStep>
  > = TField extends HelperFnChosenSteps.defaultStringOption
    ? Relaxed<TCurrentStep>
    : never;
  type resolveTuplePropertyPath<
    TCurrentStep extends AnyResolvedStep,
    TField extends chosenFields<TCurrentStep>,
    TDeepKeys extends DeepKeys<TCurrentStep> = DeepKeys<TCurrentStep>
  > = TField extends HelperFnChosenSteps.tupleNotation<TDeepKeys>
    ? TField[number] extends DeepKeys<Relaxed<TCurrentStep>>
      ? path.pickBy<Relaxed<TCurrentStep>, TField[number]>
      : never
    : never;
  type resolveObjectPropertyPath<
    TCurrentStep extends AnyResolvedStep,
    TField extends chosenFields<TCurrentStep>,
    TDeepKeys extends DeepKeys<TCurrentStep> = DeepKeys<TCurrentStep>
  > = TField extends path.generateObjectConfig<TField>
    ? path.objectToPath<TField> extends TDeepKeys
      ? path.objectToPath<TField> extends DeepKeys<Relaxed<TCurrentStep>>
        ? path.pickBy<Relaxed<TCurrentStep>, path.objectToPath<TField>>
        : never
      : never
    : never;
  type resolvePathType<
    TCurrentStep extends AnyResolvedStep,
    TField extends chosenFields<TCurrentStep>
  > = TField extends HelperFnChosenSteps.defaultStringOption
    ? 'all'
    : TField extends Array<infer _>
    ? 'tuple'
    : objectHelpers.isObject<TField> extends true
    ? 'object'
    : never;
  type resolvePathMap<
    TCurrentStep extends AnyResolvedStep,
    TField extends chosenFields<TCurrentStep>
  > = {
    all: resolveAllPropertyPath<TCurrentStep, TField>;
    tuple: resolveTuplePropertyPath<TCurrentStep, TField>;
    object: resolveObjectPropertyPath<TCurrentStep, TField>;
  };
  export type resolvedFieldValue<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends ValidStepKey<TStepNumbers>,
    TField extends chosenFields<TCurrentStep>,
    TCurrentStep extends resolvedStep<
      TResolvedStep,
      TStepNumbers,
      TTargetStep
    > = resolvedStep<TResolvedStep, TStepNumbers, TTargetStep>,
    TType extends resolvePathType<TCurrentStep, TField> = resolvePathType<
      TCurrentStep,
      TField
    >
  > = resolvePathMap<TCurrentStep, TField>[TType];
  export type chosenFields<TCurrentStep extends AnyResolvedStep> =
    | HelperFnChosenSteps.defaultStringOption
    | HelperFnChosenSteps.tupleNotation<DeepKeys<TCurrentStep>>
    | path.generateObjectConfig<TCurrentStep>;

  export type options<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends ValidStepKey<TStepNumbers>,
    TField extends chosenFields<TCurrentStep>,
    TAdditionalCtx extends Record<string, unknown>,
    TCurrentStep extends resolvedStep<
      TResolvedStep,
      TStepNumbers,
      TTargetStep
    > = resolvedStep<TResolvedStep, TStepNumbers, TTargetStep>
  > = CtxDataSelector<
    TResolvedStep,
    TStepNumbers,
    [TTargetStep],
    TAdditionalCtx
  > & {
    /**
     * The step to update.
     */
    targetStep: TTargetStep;
    /**
     * The specific fields to update.
     *
     * Optionally provide a value to narrow the results of the `ctx` in the
     * updater `fn`.
     */
    fields?: TField;
    updater: Updater<
      Expand<
        HelperFnInputBase<
          TResolvedStep,
          TStepNumbers,
          [TTargetStep],
          never,
          TAdditionalCtx
        >
      >,
      resolvedFieldValue<
        TResolvedStep,
        TStepNumbers,
        TTargetStep,
        TField,
        TCurrentStep
      >
    >;
  };
  export type availableFields<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends ValidStepKey<TStepNumbers>
  > = HelperFnChosenSteps.build<
    DeepKeys<resolvedStep<TResolvedStep, TStepNumbers, TTargetStep>>
  >;

  export type general<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>
  > = <
    targetStep extends ValidStepKey<TStepNumbers>,
    field extends chosenFields<
      resolvedStep<TResolvedStep, TStepNumbers, targetStep>
    > = 'all',
    additionalCtx extends Record<string, unknown> = {}
  >(
    options: options<
      TResolvedStep,
      TStepNumbers,
      targetStep,
      field,
      additionalCtx
    >
  ) => void;

  export type stepSpecific<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends ValidStepKey<TStepNumbers>
  > = <
    field extends chosenFields<
      resolvedStep<TResolvedStep, TStepNumbers, TTargetStep>
    > = 'all',
    additionalCtx extends Record<string, unknown> = {}
  >(
    options: Omit<
      options<TResolvedStep, TStepNumbers, TTargetStep, field, additionalCtx>,
      'targetStep'
    >
  ) => void;
}

export type StepSpecificHelperFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers
> = {
  /**
   * Create a helper function with validated input.
   */
  <validator, additionalCtx extends Record<string, unknown>, response>(
    options: Omit<
      CreateHelperFunctionOptionsWithValidator<
        TResolvedStep,
        TStepNumbers,
        [ValidStepKey<TTargetStep>],
        validator,
        additionalCtx
      >,
      'stepData'
    >,
    fn: HelperFnWithValidator<
      TResolvedStep,
      TStepNumbers,
      [ValidStepKey<TTargetStep>],
      validator,
      additionalCtx,
      response
    >
  ): CreatedHelperFnWithInput<validator, response>;
  /**
   * Create a helper function without input.
   */
  <additionalCtx extends Record<string, unknown>, response>(
    fn: HelperFnWithoutValidator<
      TResolvedStep,
      TStepNumbers,
      [ValidStepKey<TTargetStep>],
      additionalCtx,
      response
    >
  ): CreatedHelperFnWithoutInput<response>;
  /**
   * Create a helper function without input.
   */
  <response>(
    fn: HelperFnWithoutValidator<
      TResolvedStep,
      TStepNumbers,
      [ValidStepKey<TTargetStep>],
      {},
      response
    >
  ): CreatedHelperFnWithoutInput<response>;
};
export type GeneralHelperFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> = {
  /**
   * Create a helper function with validated input.
   */
  <
    const chosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
    validator,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: CreateHelperFunctionOptionsWithValidator<
      TResolvedStep,
      TStepNumbers,
      chosenSteps,
      validator,
      additionalCtx
    >,
    fn: HelperFnWithValidator<
      TResolvedStep,
      TStepNumbers,
      chosenSteps,
      validator,
      additionalCtx,
      response
    >
  ): CreatedHelperFnWithInput<validator, response>;
  /**
   * Create a helper function without input.
   */
  <
    const chosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: CreateHelperFunctionOptionsWithoutValidator<
      TResolvedStep,
      TStepNumbers,
      chosenSteps
    > &
      CreateHelperFunctionOptionsWithCustomCtxOptions<
        TResolvedStep,
        TStepNumbers,
        chosenSteps,
        additionalCtx
      >,
    fn: HelperFnWithoutValidator<
      TResolvedStep,
      TStepNumbers,
      chosenSteps,
      additionalCtx,
      response
    >
  ): CreatedHelperFnWithoutInput<response>;
};
export type CreateStepHelperFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers = TStepNumbers,
  TForSpecificStep extends boolean = false
> = TForSpecificStep extends true
  ? StepSpecificHelperFn<TResolvedStep, TStepNumbers, TTargetStep>
  : GeneralHelperFn<TResolvedStep, TStepNumbers>;
export type StepSpecificHelperFns<
  TResolvedStep extends AnyResolvedStep,
  TKey extends keyof TResolvedStep
> = {
  /**
   * A helper function to create a reusable function for the current step.
   */
  createHelperFn: CreateStepHelperFn<
    TResolvedStep,
    StepNumbers<TResolvedStep>,
    ExtractStepFromKey<Constrain<TKey, string>>,
    true
  >;
} & (TKey extends ValidStepKey<StepNumbers<TResolvedStep>>
  ? {
      /**
       * A helper function to updated the current step's data.
       */
      update: UpdateFn.stepSpecific<
        TResolvedStep,
        StepNumbers<TResolvedStep>,
        TKey
      >;
    }
  : {});
export type ResolvedStep<
  TStep extends Step<TDefaultCasing>,
  TDefaultCasing extends CasingType = DefaultCasing,
  TResolvedStep extends ResolvedStepBuilder<
    TStep,
    TDefaultCasing
  > = ResolvedStepBuilder<TStep, TDefaultCasing>,
  TAdditionalStepProps extends object = {}
> = TAdditionalStepProps & {
  [stepKey in keyof TResolvedStep]: TResolvedStep[stepKey] &
    StepSpecificHelperFns<TResolvedStep, stepKey>;
};
export type StrippedResolvedStep<
  T extends AnyResolvedStep,
  TStringUpdate extends boolean = false
> = {
  [_ in keyof T as T[_] extends Function
    ? _ extends 'update'
      ? TStringUpdate extends true
        ? never
        : _
      : never
    : _]: T[_];
};
export type AnyResolvedStep = ResolvedStep<any, any, any>;

export type ValidStepKey<N extends number = number> = `step${N}`;
export type ExtractStepFromKey<T> = T extends string
  ? T extends ValidStepKey<infer N>
    ? N
    : never
  : never;
export type InferStepOptions<T> = T extends {
  [K in keyof T extends ValidStepKey ? keyof T : never]: StepOptions<
    infer _casing extends CasingType,
    infer _stepField extends AnyStepField,
    infer _fieldValidator
  >;
}
  ? T
  : Exclude<keyof T, ValidStepKey>;
export type Range = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type ClampTo0to10<N extends number> = N extends Range
  ? N
  : // if higher than 10 → 10, if lower than 0 → 0
  number extends N
  ? never // catches the `number` type, not a literal
  : `${N}` extends `-${string}`
  ? 0
  : 10;
export type Tuple<
  N extends number,
  R extends any[] = []
> = R['length'] extends N ? R : Tuple<N, [...R, any]>;

export type GreaterThan<A extends Range, B extends Range> = Tuple<A> extends [
  ...Tuple<B>,
  ...infer _
]
  ? Tuple<B> extends [...Tuple<A>, ...infer _]
    ? false
    : true
  : false;
export type Max<T extends number[]> = T extends [
  infer A extends number,
  ...infer Rest extends number[]
]
  ? Rest['length'] extends 0
    ? ClampTo0to10<A>
    : Max<Rest> extends infer M extends Range
    ? GreaterThan<ClampTo0to10<A>, M> extends true
      ? ClampTo0to10<A>
      : M
    : never
  : never;

export type Min<T extends number[]> = T extends [
  infer A extends number,
  ...infer Rest extends number[]
]
  ? Rest['length'] extends 0
    ? ClampTo0to10<A>
    : Min<Rest> extends infer M extends Range
    ? GreaterThan<ClampTo0to10<A>, M> extends true
      ? M
      : ClampTo0to10<A>
    : never
  : never;
export type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends infer U
    ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any
      ? V
      : never
    : never
) extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = {
  // For each key K in the desired set of keys...
  [K in Keys]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
  // ...create a union of all those possible objects.
}[Keys];
export type LastStep<T extends AnyResolvedStep> = keyof T extends ValidStepKey
  ? Max<
      Constrain<
        UnionToTuple<ExtractStepFromKey<Constrain<keyof T, string>>>,
        number[]
      >
    >
  : never;
export type FirstStep<T extends AnyResolvedStep> = keyof T extends ValidStepKey
  ? Min<
      Constrain<
        UnionToTuple<ExtractStepFromKey<Constrain<keyof T, string>>>,
        number[]
      >
    >
  : never;
export type GetCurrentStep<
  T extends AnyResolvedStep,
  S extends ExtractStepFromKey<Constrain<keyof T, string>>
> = ValidStepKey<S> extends Constrain<keyof T, string>
  ? T[ValidStepKey<S>]
  : never;
export type StepData<
  T extends AnyResolvedStep,
  Step extends ExtractStepFromKey<Constrain<keyof T, string>>
> = {
  /**
   * The step number.
   */
  step: Step;
  /**
   * The step data.
   */
  data: GetCurrentStep<T, Step>;
};
export type StepNumbers<TResolvedStep extends AnyResolvedStep> =
  ExtractStepFromKey<Constrain<keyof TResolvedStep, string>>;
type WidenSpecial<T> = T extends CasingType
  ? CasingType // e.g. "title" → "camel" | "snake" | "title"
  : T extends FieldType
  ? FieldType
  : T;
export type Relaxed<T> =
  // If it's an array, recurse into elements
  T extends (infer U)[]
    ? Relaxed<U>[]
    : // If it's a function, leave alone
    T extends (...args: any[]) => any
    ? T
    : // If it's an object (record), recurse into props
    T extends object
    ? { [K in keyof T]: Relaxed<T[K]> }
    : // Otherwise widen scalars
      WidenSpecial<T>;

export namespace HelperFnChosenSteps {
  export type defaultStringOption = 'all';
  export type stringOption<T extends string> = defaultStringOption | T;
  export type tupleNotation<T extends string> = [T, ...T[]];
  export type objectNotation<T extends string> = RequireAtLeastOne<{
    [_ in T]: true;
  }>;
  export type build<
    TValue extends string,
    TStringOptions = defaultStringOption
  > = TStringOptions | tupleNotation<TValue> | objectNotation<TValue>;
  export type main<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>
  > = build<ValidStepKey<TSteps>>;
  export type extractStepNumber<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<
      TResolvedStep,
      TSteps
    > = HelperFnChosenSteps<TResolvedStep, TSteps>
  > = TChosenSteps extends tupleNotation<ValidStepKey<TSteps>>
    ? keyof { [step in TChosenSteps[number] as ExtractStepFromKey<step>]: step }
    : TChosenSteps extends objectNotation<ValidStepKey<TSteps>>
    ? ExtractStepFromKey<keyof TChosenSteps>
    : TSteps;
  export type resolve<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  > = TChosenSteps extends 'all'
    ? keyof TResolvedStep
    : TChosenSteps extends tupleNotation<ValidStepKey<TSteps>>
    ? TChosenSteps[number]
    : TChosenSteps extends objectNotation<ValidStepKey<TSteps>>
    ? keyof TChosenSteps
    : never;

  export const CATCH_ALL_MESSAGE =
    'The chosen steps must either be set to on of the following: "all", an array of steps (["step1", "step2", ...]), or an object containing the steps to chose ({ step1: true, step2: true, ...})';

  export function isAll(value: unknown): value is defaultStringOption {
    return Boolean(value && typeof value === 'string' && value === 'all');
  }

  export function isTuple<T extends number>(
    value: unknown,
    validValues?: Array<unknown>
  ): value is tupleNotation<ValidStepKey<T>> {
    if (!Array.isArray(value)) {
      return false;
    }

    if (validValues) {
      return value.every((key) => validValues.includes(key));
    }

    return true;
  }

  export function isObject<T extends number>(
    value: unknown,
    validKeys?: Array<unknown>
  ): value is objectNotation<ValidStepKey<T>> {
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
}

export type HelperFnChosenSteps<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>
> = HelperFnChosenSteps.main<TResolvedStep, TSteps>;

export type CreateHelperFunctionOptionsBase<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
> = {
  /**
   * The step data to use for the function. It can either be an array with the **available**
   * step numbers or `'all'`.
   *
   * - If set to `'all'`, data from **all** the steps will be available.
   * - If an array of the **available** step numbers is provided, only data from those steps will be available.
   */
  stepData: TChosenSteps;
};
export type CreateHelperFunctionOptionsWithoutValidator<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>
> = CreateHelperFunctionOptionsBase<TResolvedStep, TStepNumbers, TChosenSteps>;
export interface CtxDataSelector<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  TAdditionalCtx extends Record<string, unknown>
> {
  /**
   * A function to select the data that will be available in the `fn`'s ctx.
   * @param input The available input to create the context with.
   * @returns The created ctx.
   */
  ctxData?: (
    input: Pick<
      HelperFnInputBase<
        TResolvedStep,
        TStepNumbers,
        'all',
        HelperFnChosenSteps.resolve<TResolvedStep, TStepNumbers, TChosenSteps>
      >,
      'ctx'
    >
  ) => TAdditionalCtx;
}
export type CreateHelperFunctionOptionsWithCustomCtxOptions<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  TAdditionalCtx extends Record<string, unknown>
> = CreateHelperFunctionOptionsBase<TResolvedStep, TStepNumbers, TChosenSteps> &
  CtxDataSelector<TResolvedStep, TStepNumbers, TChosenSteps, TAdditionalCtx>;
export type CreateHelperFunctionOptionsWithValidator<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  TValidator,
  TAdditionalCtx extends Record<string, unknown>
> = CreateHelperFunctionOptionsBase<TResolvedStep, TStepNumbers, TChosenSteps> &
  CreateHelperFunctionOptionsWithCustomCtxOptions<
    TResolvedStep,
    TStepNumbers,
    TChosenSteps,
    TAdditionalCtx
  > & {
    /**
     * A validator used to validate the params.
     */
    validator: Constrain<TValidator, AnyValidator, DefaultValidator>;
  };
// TODO figure out way to make data optional in specific cases
// example 1: if validateFields === { optionalValue?: string }, then `data` should be
// optional since there is only one optional field
// In words: if `validatedFields` only contains optional properties, then `data` should be optional
// Approach: different interfaces (maybe)
export type CreatedHelperFnInput<T> = {
  data: Expand<ResolveValidatorOutput<T>>;
};
export type CreatedHelperFnWithInput<TValidator, TResponse> = (
  input: CreatedHelperFnInput<TValidator>
) => TResponse;
export type CreatedHelperFnWithoutInput<TResponse> = () => TResponse;
type isString<T> = T extends string ? T : never;
export type HelperFnCtx<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TOmitSteps extends HelperFnChosenSteps.resolve<
    TResolvedStep,
    TSteps,
    TChosenSteps
  > = never
> = TChosenSteps extends 'all'
  ? Expand<
      Omit<
        {
          [key in TSteps as `step${key}`]: StrippedResolvedStep<
            GetCurrentStep<TResolvedStep, key>
          >;
        },
        isString<TOmitSteps>
      >
    >
  : TChosenSteps extends object
  ? keyof TChosenSteps extends ValidStepKey<TSteps>
    ? Expand<
        Omit<
          {
            -readonly [key in keyof TChosenSteps]: StrippedResolvedStep<
              GetCurrentStep<
                TResolvedStep,
                // @ts-ignore
                ExtractStepFromKey<key>
              >
            >;
          },
          isString<TOmitSteps>
        >
      >
    : TChosenSteps extends ValidStepKey<TSteps>[]
    ? Expand<
        Omit<
          {
            [key in TChosenSteps[number]]: StrippedResolvedStep<
              GetCurrentStep<
                TResolvedStep,
                // @ts-ignore
                ExtractStepFromKey<key>
              >
            >;
          },
          isString<TOmitSteps>
        >
      >
    : never
  : never;

export type helperFnUpdateFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TSteps extends ValidStepKey<TStepNumbers>
> = {
  [step in TSteps]: UpdateFn.stepSpecific<TResolvedStep, TStepNumbers, step>;
};
export type HelperFnUpdateFn<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
> = UpdateFn.general<TResolvedStep, TSteps> &
  (TChosenSteps extends HelperFnChosenSteps.defaultStringOption
    ? helperFnUpdateFn<TResolvedStep, TSteps, ValidStepKey<TSteps>>
    : TChosenSteps extends HelperFnChosenSteps.tupleNotation<
        ValidStepKey<TSteps>
      >
    ? helperFnUpdateFn<TResolvedStep, TSteps, TChosenSteps[number]>
    : TChosenSteps extends HelperFnChosenSteps.objectNotation<
        ValidStepKey<TSteps>
      >
    ? {
        [step in keyof TChosenSteps]: step extends ValidStepKey<TSteps>
          ? helperFnUpdateFn<TResolvedStep, TSteps, step>[step]
          : {};
      }
    : {});

export interface HelperFnInputBase<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TOmitSteps extends HelperFnChosenSteps.resolve<
    TResolvedStep,
    TSteps,
    TChosenSteps
  > = never,
  TAdditionalCtx extends Record<string, unknown> = {}
> {
  /**
   * The multi-step form step context.
   */
  // TODO determine if this should be renamed to `steps` since it only has the step data
  ctx: Expand<
    HelperFnCtx<TResolvedStep, TSteps, TChosenSteps, TOmitSteps> &
      TAdditionalCtx
  >;
  /**
   * A function to update parts of the multi-step form schema.
   */
  update: HelperFnUpdateFn<TResolvedStep, TSteps, TChosenSteps>;
}
export type HelperFnInputWithValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TValidator,
  TAdditionalCtx extends Record<string, unknown>
> = HelperFnInputBase<
  TResolvedStep,
  TSteps,
  TChosenSteps,
  never,
  TAdditionalCtx
> & {
  data: ResolveValidatorOutput<TValidator>;
};
export type HelperFnInputWithoutValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TAdditionalCtx extends Record<string, unknown>
> = HelperFnInputBase<
  TResolvedStep,
  TSteps,
  TChosenSteps,
  never,
  TAdditionalCtx
>;

export type HelperFnWithValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TValidator,
  TAdditionalCtx extends Record<string, unknown>,
  Response
> = (
  input: HelperFnInputWithValidator<
    TResolvedStep,
    TSteps,
    TChosenSteps,
    TValidator,
    TAdditionalCtx
  >
) => Response;
export type HelperFnWithoutValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TAdditionalCtx extends Record<string, unknown>,
  Response
> = (
  input: HelperFnInputWithoutValidator<
    TResolvedStep,
    TSteps,
    TChosenSteps,
    TAdditionalCtx
  >
) => Response;
export interface MultiStepFormSchemaStepConfig<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TStorageKey extends string
> extends NameTransformCasingOptions<TCasing> {
  /**
   * The steps that this multi step form will include.
   */
  steps: InferStepOptions<TStep>;
  /**
   * The options for the storage module.
   */
  storage?: Omit<StorageConfig<any, TStorageKey>, 'data'>;
}
