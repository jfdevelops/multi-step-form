import { casing } from '@multi-step-form/casing';
import { types } from '@multi-step-form/compile-time-utils';
import {
  AnyValidator,
  DefaultValidator,
  invariant,
  type ResolveValidatorOutput,
} from '@multi-step-form/runtime-utils';

type CasingType = casing.CasingType;
export type FieldType = (typeof FIELD_TYPES)[number];
export type DefaultCasing = typeof casing.DEFAULT_CASING;
export type DefaultFieldType = typeof DEFAULT_FIELD_TYPE;
export type NameTransformCasingOptions<TCasing extends CasingType> = {
  /**
   * How the `name` should be transformed for the `label`.
   *
   * If omitted, the default will be whatever is set during {@linkcode MultiStepFormSchema} initialization.
   */
  nameTransformCasing?: types.Constrain<TCasing, CasingType>;
};
export type StepFieldOptions<
  Type extends FieldType,
  Casing extends CasingType,
  DefaultValue
> = NameTransformCasingOptions<Casing> & {
  defaultValue: DefaultValue;
  /**
   * The type of the field.
   *
   * @default 'string'
   */
  type?: Type;
  // TODO add support for confirmation modal
  // /**
  //  * How the field should be displayed when on the confirmation modal.
  //  *
  //  * By default it will be the same as regular field config.
  //  */
  // onConfirmationConfig?: Omit<
  //   StepField<Name, FieldType, unknown>,
  //   'name' | 'onConfirmationConfig'
  // >;
  /**
   * The text for the label.
   *
   * If omitted, it will default to the specified casing.
   *
   * If `false`, `label` will be `undefined`, meaning there won't
   * be a label for this field.
   */
  label?: string | false;
};
export type AnyStepFieldOption = StepFieldOptions<
  FieldType,
  CasingType,
  unknown
>;
export type AnyStepField = Record<string, AnyStepFieldOption>;
export type StepOptions<
  Casing extends CasingType = CasingType,
  TStepField extends AnyStepField = AnyStepField,
  FieldValidator = unknown
> = NameTransformCasingOptions<Casing> & {
  title: string;
  description?: string;
  fields: TStepField;
  /**
   * Validator for the fields.
   */
  validateFields?: types.Constrain<
    FieldValidator,
    AnyValidator,
    DefaultValidator
  >;
};
export type Step<
  TCasing extends CasingType = CasingType,
  step extends number = number,
  options extends StepOptions<
    TCasing,
    // StepFieldOptions<string, FieldType, TCasing, unknown>,
    AnyStepField,
    unknown
  > = StepOptions<
    TCasing,
    AnyStepField,
    // StepFieldOptions<string, FieldType, TCasing, unknown>,
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
  [name in keyof TFields]: types.Expand<
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
  T extends Step,
  TInferredSteps extends InferStepOptions<T> = InferStepOptions<T>,
  TDefaultCasing extends CasingType = DefaultCasing
> = types.Expand<{
  [stepKey in keyof TInferredSteps]: types.Expand<
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
      fields: types.Expand<ResolvedFields<TInferredSteps, stepKey>>;
    }
  >;
}>;
export type Updater<TInput, TOutput = TInput> =
  | TOutput
  | ((input: TInput) => TOutput);
export type CurriedUpdateStepFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers
> = {
  /**
   * Update a specific field's data for the specified step.
   * @param step The step to update.
   * @param field The field to update.
   * @param updater The updated data for field.
   */
  // NOTE: This overload is first so that `field` gets autocomplete
  <
    CurrentStepData extends GetCurrentStep<TResolvedStep, TTargetStep>,
    Field extends keyof CurrentStepData,
    TUpdater extends Updater<
      CurrentStepData[Field],
      Relaxed<CurrentStepData[Field]>
    >
  >(
    field: Field,
    updater: TUpdater
  ): void;
  /**
   * Update the data for a specified step.
   * @param step The step to update.
   * @param updater The updated data for the step.
   */
  <
    CurrentStepData extends GetCurrentStep<TResolvedStep, TTargetStep>,
    TUpdater extends Updater<CurrentStepData, Relaxed<CurrentStepData>>
  >(
    updater: TUpdater
  ): void;
};
export type RegularUpdateStepFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> = {
  /**
   * Update a specific field's data for the specified step.
   * @param step The step to update.
   * @param field The field to update.
   * @param updater The updated data for field.
   */
  // NOTE: This overload is first so that `field` gets autocomplete
  <
    TargetStep extends TStepNumbers,
    CurrentStepData extends GetCurrentStep<TResolvedStep, TargetStep>,
    Field extends keyof CurrentStepData,
    TUpdater extends Updater<
      CurrentStepData[Field],
      Relaxed<CurrentStepData[Field]>
    >
  >(
    step: TargetStep,
    field: Field,
    updater: TUpdater
  ): void;
  /**
   * Update the data for a specified step.
   * @param step The step to update.
   * @param updater The updated data for the step.
   */
  <
    TargetStep extends TStepNumbers,
    CurrentStepData extends GetCurrentStep<TResolvedStep, TargetStep>,
    TUpdater extends Updater<CurrentStepData, Relaxed<CurrentStepData>>
  >(
    step: TargetStep,
    updater: TUpdater
  ): void;
};
export type UpdateStepFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers = TStepNumbers,
  TUseCurried extends boolean = false
> = TUseCurried extends true
  ? CurriedUpdateStepFn<TResolvedStep, TStepNumbers, TTargetStep>
  : RegularUpdateStepFn<TResolvedStep, TStepNumbers>;

export type StepSpecificHelperFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers
> = {
  /**
   * Create a helper function with validated input.
   */
  <Validator, Response>(
    options: Omit<
      CreateHelperFunctionOptionsWithValidator<
        TResolvedStep,
        TStepNumbers,
        [ValidStepKey<TTargetStep>],
        Validator
      >,
      'stepData'
    >,
    fn: HelperFnWithValidator<
      TResolvedStep,
      TStepNumbers,
      [ValidStepKey<TTargetStep>],
      Validator,
      Response
    >
  ): CreatedHelperFnWithInput<
    TResolvedStep,
    TStepNumbers,
    [ValidStepKey<TTargetStep>],
    Validator,
    Response
  >;
  /**
   * Create a helper function without input.
   */
  <Response>(
    fn: HelperFnWithoutValidator<
      TResolvedStep,
      TStepNumbers,
      [ValidStepKey<TTargetStep>],
      Response
    >
  ): CreatedHelperFnWithoutInput<Response>;
};
export type GeneralHelperFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> = {
  /**
   * Create a helper function with validated input.
   */
  <
    const ChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
    Validator,
    Response
  >(
    options: CreateHelperFunctionOptionsWithValidator<
      TResolvedStep,
      TStepNumbers,
      ChosenSteps,
      Validator
    >,
    fn: HelperFnWithValidator<
      TResolvedStep,
      TStepNumbers,
      ChosenSteps,
      Validator,
      Response
    >
  ): CreatedHelperFnWithInput<
    TResolvedStep,
    TStepNumbers,
    ChosenSteps,
    Validator,
    Response
  >;
  /**
   * Create a helper function without input.
   */
  <
    const ChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
    Response
  >(
    options: CreateHelperFunctionOptionsWithoutValidator<
      TResolvedStep,
      TStepNumbers,
      ChosenSteps
    >,
    fn: HelperFnWithoutValidator<
      TResolvedStep,
      TStepNumbers,
      ChosenSteps,
      Response
    >
  ): CreatedHelperFnWithoutInput<Response>;
};
export type CreateStepHelperFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers = TStepNumbers,
  TForSpecificStep extends boolean = false
> = TForSpecificStep extends true
  ? StepSpecificHelperFn<TResolvedStep, TStepNumbers, TTargetStep>
  : GeneralHelperFn<TResolvedStep, TStepNumbers>;
export type ResolvedStep<
  TStep extends Step<TDefaultCasing>,
  TInferredSteps extends InferStepOptions<TStep> = InferStepOptions<TStep>,
  TDefaultCasing extends CasingType = DefaultCasing,
  TResolvedStep extends ResolvedStepBuilder<
    TStep,
    TInferredSteps,
    TDefaultCasing
  > = ResolvedStepBuilder<TStep, TInferredSteps, TDefaultCasing>,
  TAdditionalStepProps extends object = {}
> = TAdditionalStepProps & {
  [stepKey in keyof TResolvedStep]: TResolvedStep[stepKey] & {
    update: UpdateStepFn<
      // @ts-ignore
      TResolvedStep,
      StepNumbers<TResolvedStep>,
      ExtractStepFromKey<types.Constrain<stepKey, string>>,
      true
    >;
    createHelperFn: CreateStepHelperFn<
      // @ts-ignore
      TResolvedStep,
      StepNumbers<TResolvedStep>,
      ExtractStepFromKey<types.Constrain<stepKey, string>>,
      true
    >;
  };
};
export type AnyResolvedStep = ResolvedStep<any, any, any, any>;

export type ValidStepKey<N extends number = number> = `step${N}`;
export type ExtractStepFromKey<T extends string> = T extends ValidStepKey<
  infer N
>
  ? N
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
export type SetDefaultString<T extends string, Default extends T> = Default;
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
      types.Constrain<
        UnionToTuple<ExtractStepFromKey<types.Constrain<keyof T, string>>>,
        number[]
      >
    >
  : never;
export type FirstStep<T extends AnyResolvedStep> = keyof T extends ValidStepKey
  ? Min<
      types.Constrain<
        UnionToTuple<ExtractStepFromKey<types.Constrain<keyof T, string>>>,
        number[]
      >
    >
  : never;
export type GetCurrentStep<
  T extends AnyResolvedStep,
  S extends ExtractStepFromKey<types.Constrain<keyof T, string>>
> = ValidStepKey<S> extends types.Constrain<keyof T, string>
  ? T[ValidStepKey<S>]
  : never;
export type StepData<
  T extends AnyResolvedStep,
  Step extends ExtractStepFromKey<types.Constrain<keyof T, string>>
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
  ExtractStepFromKey<types.Constrain<keyof TResolvedStep, string>>;
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

export type Join<T extends string[], D extends string> = T extends [
  infer F extends string,
  ...infer R extends string[]
]
  ? R['length'] extends 0
    ? F
    : `${F}${D}${Join<R, D>}`
  : '';

export type HelperFnChosenSteps<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>
> =
  | 'all'
  | [ValidStepKey<TSteps>, ...ValidStepKey<TSteps>[]]
  | RequireAtLeastOne<{
      [key in ValidStepKey<TSteps>]: true;
    }>;
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
export type CreateHelperFunctionOptionsWithValidator<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  TValidator
> = CreateHelperFunctionOptionsBase<
  TResolvedStep,
  TStepNumbers,
  TChosenSteps
> & {
  /**
   * A validator used to validate the params.
   */
  validator: types.Constrain<TValidator, AnyValidator, DefaultValidator>;
};
export type CreatedHelperFnWithInput<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  TValidator,
  TResponse
> = (
  input: types.Expand<
    Omit<
      HelperFnInputWithValidator<
        TResolvedStep,
        TStepNumbers,
        TChosenSteps,
        TValidator
      >,
      'ctx'
    >
  >
) => TResponse;
export type CreatedHelperFnWithoutInput<TResponse> = () => TResponse;
export type HelperFnCtx<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
> = TChosenSteps extends 'all'
  ? { [key in TSteps as `step${key}`]: GetCurrentStep<TResolvedStep, key> }
  : TChosenSteps extends object
  ? keyof TChosenSteps extends ValidStepKey<TSteps>
    ? {
        -readonly [key in keyof TChosenSteps]: GetCurrentStep<
          TResolvedStep,
          // @ts-ignore
          ExtractStepFromKey<key>
        >;
      }
    : TChosenSteps extends ValidStepKey<TSteps>[]
    ? {
        [key in TChosenSteps[number]]: GetCurrentStep<
          TResolvedStep,
          // @ts-ignore
          ExtractStepFromKey<key>
        >;
      }
    : never
  : never;

export type HelperFnInputBase<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
> = {
  ctx: HelperFnCtx<TResolvedStep, TSteps, TChosenSteps>;
};
export type HelperFnInputWithValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TValidator
> = HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps> & {
  data: ResolveValidatorOutput<TValidator>;
};
export type HelperFnInputWithoutValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
> = HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps>;

export type HelperFnWithValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TValidator,
  Response
> = (
  input: HelperFnInputWithValidator<
    TResolvedStep,
    TSteps,
    TChosenSteps,
    TValidator
  >
) => Response;
export type HelperFnWithoutValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  Response
> = (
  input: HelperFnInputWithoutValidator<TResolvedStep, TSteps, TChosenSteps>
) => Response;
export type MultiStepFormSchemaStepConfig<
  TStep extends Step<TCasing>,
  TCasing extends CasingType
> = NameTransformCasingOptions<TCasing> & {
  /**
   * The steps that this multi step form will include.
   */
  steps: InferStepOptions<TStep>;
};

export const FIELD_TYPES = [
  'string',
  'string.phone',
  'string.email',
  'string.time',
  'number',
  'number.counter',
  'date',
  'dateTime',
  'boolean.switch',
] as const;
export const DEFAULT_FIELD_TYPE: types.SetDefaultString<FieldType, 'string'> =
  'string';

export namespace step {
  /**
   * Gets the step number from an input string.
   * @param input The input to extract the step number from.
   * @returns The extracted step number.
   */
  export function extractNumber(input: string) {
    invariant(
      input.includes('step'),
      "Can't extract a valid step number since"
    );

    const extracted = input.replace('step', '');

    invariant(/^\d+$/.test(extracted), `Invalid step format: "${input}"`);

    return Number.parseInt(extracted, 10);
  }

  /**
   * A factory function to get the data of a specific step.
   * @param resolvedStepValues The resolved step values.
   * @returns A function to get specific step data from a target step.
   */
  export function get<
    step extends Step<casing>,
    resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
    stepNumbers extends StepNumbers<resolvedStep>,
    casing extends CasingType
  >(resolvedStepValues: resolvedStep) {
    /**
     * Gets the step data associated with the target step number.
     *
     * @example
     * const getStep = step.get(resolvedStepValues);
     * const result = getStep({ step: 1 });
     * // result: { step: 1, data: ... }
     *
     * @returns An object containing the `step` number and the associated step data.
     */
    return function <stepNumber extends stepNumbers>(options: {
      step: stepNumber;
    }) {
      const { step } = options;
      const stepKey = `step${step}` as keyof resolvedStep;

      const data = resolvedStepValues[stepKey] as GetCurrentStep<
        resolvedStep,
        stepNumber
      >;

      return { step, data };
    };
  }
}
