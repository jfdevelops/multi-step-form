import { changeCasing, setCasingType, type CasingType } from './casing';
import { Subscribable } from './subscribable';
import {
  comparePartialArray,
  invariant,
  printErrors,
  type Constrain,
  type Expand,
  type Join,
  type Max,
  type Min,
  type RequireAtLeastOne,
  type SetDefault,
  type SetDefaultString,
  type UnionToTuple,
  type Updater,
} from './utils';
import {
  runStandardValidation,
  type AnyValidator,
  type DefaultValidator,
  type ResolveValidatorOutput,
  type StandardSchemaValidator,
} from './validators';

export type StringFieldType = 'phone' | 'email' | 'time';
export type NumberFieldType = 'counter';
export type BooleanFieldType = 'switch';
export type FieldType =
  | 'string'
  | `string.${StringFieldType}`
  | 'number'
  | `number.${NumberFieldType}`
  | 'date'
  | 'dateTime'
  | `boolean.${BooleanFieldType}`;

export type DefaultCasing = typeof DEFAULT_CASING;
export type DefaultFieldType = typeof DEFAULT_FIELD_TYPE;
export type NameTransformCasingOptions<TCasing extends CasingType> = {
  /**
   * How the `name` should be transformed for the `label`.
   *
   * If omitted, the default will be whatever is set during {@linkcode MultiStepFormSchema} initialization.
   */
  nameTransformCasing?: Constrain<TCasing, CasingType>;
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
  // Field extends StepFieldOptions<
  //   string,
  //   FieldType,
  //   CasingType,
  //   unknown
  // > = StepFieldOptions<string, FieldType, CasingType, unknown>,
  TStepField extends AnyStepField = AnyStepField,
  FieldValidator = unknown
> = NameTransformCasingOptions<Casing> & {
  title: string;
  description?: string;
  fields: TStepField;
  // fields: Array<Field>;
  /**
   * Validator for the fields.
   */
  validateFields?: Constrain<FieldValidator, AnyValidator, DefaultValidator>;
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

type GetFieldsForStep<
  Steps extends InferStepOptions<any>,
  Key extends keyof Steps
> = Steps[Key] extends {
  fields: infer fields extends AnyStepField;
}
  ? fields
  : never;
type GetDefaultCasingTransformation<
  Step extends InferStepOptions<any>,
  Key extends keyof Step,
  TDefault extends CasingType = DefaultCasing
> = Step[Key] extends { nameTransformCasing: infer casing extends CasingType }
  ? casing
  : TDefault;

type ResolvedFields<
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

type ResolvedStepBuilder<
  T extends Step,
  TInferredSteps extends InferStepOptions<T> = InferStepOptions<T>,
  TDefaultCasing extends CasingType = DefaultCasing
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
type CurriedUpdateStepFn<
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
type RegularUpdateStepFn<
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

type StepSpecificHelperFn<
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
type GeneralHelperFn<
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
  > = ResolvedStepBuilder<TStep, TInferredSteps, TDefaultCasing>
> = {
  [stepKey in keyof TResolvedStep]: TResolvedStep[stepKey] & {
    update: UpdateStepFn<
      // @ts-ignore
      TResolvedStep,
      StepNumbers<TResolvedStep>,
      ExtractStepFromKey<Constrain<stepKey, string>>,
      true
    >;
    createHelperFn: CreateStepHelperFn<
      // @ts-ignore
      TResolvedStep,
      StepNumbers<TResolvedStep>,
      ExtractStepFromKey<Constrain<stepKey, string>>,
      true
    >;
  };
};
export type AnyResolvedStep = ResolvedStep<any, any, any, any>;

type ValidStepKey<N extends number = number> = `step${N}`;
type ExtractStepFromKey<T extends string> = T extends ValidStepKey<infer N>
  ? N
  : never;
export type InferStepOptions<T> = T extends {
  [K in keyof T extends ValidStepKey ? keyof T : never]: StepOptions<
    infer _casing extends CasingType,
    // infer _stepField extends StepFieldOptions<
    //   string,
    //   FieldType,
    //   CasingType,
    //   unknown
    // >,
    infer _stepField extends AnyStepField,
    infer _fieldValidator
  >;
}
  ? T
  : Exclude<keyof T, ValidStepKey>;

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
type GetCurrentStep<
  T extends AnyResolvedStep,
  S extends ExtractStepFromKey<Constrain<keyof T, string>>
> = ValidStepKey<S> extends Constrain<keyof T, string>
  ? T[ValidStepKey<S>]
  : never;
type StepData<
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
type Relaxed<T> =
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

type Quote<T extends string[]> = {
  [K in keyof T]: T[K] extends string ? `'${T[K]}'` : never;
};

type AsType = (typeof AS_TYPES)[number];
type AsTypeMap<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends ExtractStepFromKey<Constrain<keyof resolvedStep, string>>
> = {
  // Exclude is needed due to all the Constrains
  string: Exclude<
    Join<
      Constrain<
        Quote<Constrain<UnionToTuple<`${stepNumbers}`>, string[]>>,
        string[]
      >,
      ' | '
    >,
    ''
  >;
  number: Exclude<
    Join<Constrain<UnionToTuple<`${stepNumbers}`>, string[]>, ' | '>,
    ''
  >;
  'array.string': UnionToTuple<`${stepNumbers}`>;
};
type AsFunctionReturn<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends ExtractStepFromKey<Constrain<keyof resolvedStep, string>>,
  asType extends AsType
> = AsTypeMap<resolvedStep, stepNumbers>[asType];
type AsFunction<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends ExtractStepFromKey<Constrain<keyof resolvedStep, string>>
> = <asType extends AsType>(
  asType: asType
) => AsFunctionReturn<resolvedStep, stepNumbers, asType>;

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
type CreateHelperFunctionOptionsWithoutValidator<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>
> = CreateHelperFunctionOptionsBase<TResolvedStep, TStepNumbers, TChosenSteps>;
type CreateHelperFunctionOptionsWithValidator<
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
  validator: Constrain<TValidator, AnyValidator, DefaultValidator>;
};
type CreatedHelperFnWithInput<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  TValidator,
  TResponse
> = (
  input: Expand<
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
type CreatedHelperFnWithoutInput<TResponse> = () => TResponse;
type HelperFnCtx<
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
type HelperFnInputWithValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TValidator
> = HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps> & {
  data: ResolveValidatorOutput<TValidator>;
};
type HelperFnInputWithoutValidator<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
> = HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps>;

type HelperFnWithValidator<
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
type HelperFnWithoutValidator<
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

export interface MultiStepFormStepSchemaFunctions<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> {
  update: UpdateStepFn<TResolvedStep, TStepNumbers>;
  createHelperFn: CreateStepHelperFn<TResolvedStep, TStepNumbers>;
}
export type MultiStepFormStepStepsConfig<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> = {
  first: FirstStep<TResolvedStep>;
  last: LastStep<TResolvedStep>;
  value: ReadonlyArray<TStepNumbers>;
  as: AsFunction<TResolvedStep, TStepNumbers>;
};
export type MultiStepFormStepSchemaListener<
  TStep extends Step<TCasing>,
  TResolvedStep extends ResolvedStep<TStep, InferStepOptions<TStep>, TCasing>,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TCasing extends CasingType
> = (data: {
  original: InferStepOptions<TStep>;
  value: TResolvedStep;
  steps: MultiStepFormStepStepsConfig<TResolvedStep, TStepNumbers>;
  defaultNameTransformationCasing: TCasing;
}) => void;

export const DEFAULT_CASING: SetDefaultString<CasingType, 'title'> = 'title';
export const DEFAULT_FIELD_TYPE: SetDefaultString<FieldType, 'string'> =
  'string';
/**
 * Available transformation types for the step numbers.
 */
const AS_TYPES = ['string', 'number', 'array.string'] as const;
export const VALIDATED_STEP_REGEX = /^step\d+$/i;

function createFieldLabel(
  label: string | false | undefined,
  fieldName: string,
  casingType: CasingType
) {
  return label ?? changeCasing(fieldName, casingType);
}

function createStepFields(options: {
  fields: AnyStepField;
  validateFields:
    | Constrain<unknown, AnyValidator, DefaultValidator>
    | undefined;
  defaultCasing: CasingType;
}) {
  const resolvedFields: Record<string, unknown> = {};
  const { fields, defaultCasing, validateFields } = options;

  for (const [name, values] of Object.entries(fields)) {
    invariant(
      typeof name === 'string',
      `Each key for the "fields" option must be a string. Key ${name} was a ${typeof name}`
    );
    invariant(
      typeof values === 'object',
      `The value for key ${name} must be an object. Was ${typeof values}`
    );

    const {
      defaultValue,
      label,
      nameTransformCasing,
      type = DEFAULT_FIELD_TYPE,
    } = values;

    if (validateFields) {
      resolvedFields[name] = defaultValue;
    } else {
      const casing = nameTransformCasing ?? defaultCasing;

      resolvedFields[name] = {
        ...(resolvedFields[name] as Record<string, unknown>),
        nameTransformCasing: casing,
        type,
        defaultValue,
        label: createFieldLabel(label, name, casing),

        // TODO add more fields here
      };
    }
  }

  if (validateFields) {
    const validatedFields = runStandardValidation(
      validateFields as StandardSchemaValidator,
      resolvedFields
    );

    invariant(
      typeof validatedFields === 'object',
      `The result of the validated fields must be an object, was (${typeof validatedFields}). This is probably an internal error, so open up an issue about it`
    );
    invariant(
      !!validatedFields,
      'The result of the validated fields must be defined. This is probably an internal error, so open up an issue about it'
    );

    for (const [name, defaultValue] of Object.entries(validatedFields)) {
      const currentField = fields[name];

      invariant(
        currentField,
        `No field found in the fields config for "${name}"`
      );

      const {
        label,
        type = DEFAULT_FIELD_TYPE,
        nameTransformCasing,
      } = currentField;
      const casing = nameTransformCasing ?? defaultCasing;

      resolvedFields[name] = {
        ...(resolvedFields[name] as Record<string, unknown>),
        nameTransformCasing: casing,
        type,
        defaultValue,
        label: createFieldLabel(label, name, casing),
      };
    }
  }

  return resolvedFields;
}

export function createStep<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  casing extends CasingType = DefaultCasing
>(stepsConfig: InferStepOptions<step>) {
  const resolvedSteps = {} as resolvedStep;

  invariant(!!stepsConfig, 'The steps config must be defined', TypeError);
  invariant(
    typeof stepsConfig === 'object',
    `The steps config must be an object, was (${typeof stepsConfig})`,
    TypeError
  );

  for (const [stepKey, stepValue] of Object.entries(stepsConfig)) {
    invariant(
      typeof stepKey === 'string',
      `Each key for the step config must be a string. Key "${stepKey}" was ${typeof stepKey} `,
      TypeError
    );
    invariant(
      VALIDATED_STEP_REGEX.test(stepKey),
      `The key "${stepKey}" isn't formatted properly. Each key in the step config must be the following format: "step{number}"`
    );

    const validStepKey = stepKey as keyof resolvedStep;
    const {
      fields,
      title,
      nameTransformCasing: defaultCasing = DEFAULT_CASING,
      description,
      validateFields,
    } = stepValue;

    const currentStep = validStepKey.toString().replace('step', '');

    invariant(
      fields,
      `Missing fields for step ${currentStep} (${String(validStepKey)})`,
      TypeError
    );
    invariant(
      typeof fields === 'object',
      'Fields must be an object',
      TypeError
    );
    invariant(
      Object.keys(fields).length > 0,
      `The fields config for step ${currentStep} (${String(
        validStepKey
      )}) is empty. Please add a field`
    );
    invariant(
      typeof fields === 'object',
      `The "fields" property must be an object. Was ${typeof fields}`
    );

    const resolvedFields = createStepFields({
      defaultCasing,
      fields,
      validateFields,
    });

    resolvedSteps[validStepKey] = {
      ...resolvedSteps[validStepKey],
      title,
      nameTransformCasing: defaultCasing,
      // Only add the description if it's defined
      ...(typeof description === 'string' ? { description } : {}),
      fields: resolvedFields,
    };
  }

  return resolvedSteps;
}

export class MultiStepFormStepSchema<
    step extends Step<casing>,
    resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
    stepNumbers extends StepNumbers<resolvedStep>,
    casing extends CasingType = DefaultCasing
  >
  extends Subscribable<
    MultiStepFormStepSchemaListener<step, resolvedStep, stepNumbers, casing>
  >
  implements MultiStepFormStepSchemaFunctions<resolvedStep, stepNumbers>
{
  /**
   * The original config before any validation or transformations have been applied.
   */
  readonly original: InferStepOptions<step>;
  value: resolvedStep;
  readonly steps: MultiStepFormStepStepsConfig<resolvedStep, stepNumbers>;
  readonly defaultNameTransformationCasing: casing;
  // @ts-ignore
  // TODO fix error: Type instantiation is excessively deep and possibly infinite.
  private readonly firstStep: StepData<resolvedStep, FirstStep<resolvedStep>>;
  private readonly lastStep: StepData<resolvedStep, LastStep<resolvedStep>>;
  private readonly stepNumbers: Array<number>;

  constructor(
    config: MultiStepFormSchemaStepConfig<step, Constrain<casing, CasingType>>
  ) {
    super();

    const { steps, nameTransformCasing } = config;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing,
      DEFAULT_CASING
    ) as casing;

    this.original = steps;
    this.value = createStep<step, resolvedStep, casing>(this.original);

    // Add the update function to each step
    for (const [stepKey, stepValue] of Object.entries(this.value)) {
      const step = parseInt(stepKey.replace('step', '')) as stepNumbers;

      this.value[stepKey as keyof resolvedStep] = {
        // Cast here since we know that `this.value` is already validated
        ...(stepValue as object),
        update: this.createStepUpdaterFn(step),
        createHelperFn: this.createStepHelperFn(step),
      } as any;
    }

    this.stepNumbers = Object.keys(this.value).map((key) =>
      parseInt(key.replace('step', ''))
    );
    this.firstStep = this.first();
    this.lastStep = this.last();
    this.steps = {
      first: this.firstStep.step,
      last: this.lastStep.step,
      value: this.stepNumbers as unknown as ReadonlyArray<stepNumbers>,
      as: (asType): any => {
        invariant(
          typeof asType === 'string',
          `The type of the target transformation type must be a string, was ${typeof asType}`
        );

        if (asType === 'string') {
          return this.stepNumbers.map((value) => `'${value}'`).join(' | ');
        }

        if (asType === 'number') {
          return this.stepNumbers.join(' | ');
        }

        if (asType === 'array.string') {
          return this.stepNumbers.map((value) => `${value}`);
        }

        throw new Error(
          `Transformation type "${asType}" is not supported. Available transformations include: ${AS_TYPES.map(
            (value) => `"${value}"`
          ).join(', ')}`
        );
      },
    };
  }

  private extractNumberFromStep(input: string) {
    invariant(
      input.includes('step'),
      "Can't extract a valid step number since"
    );

    const extracted = input.replace('step', '');

    invariant(/^\d+$/.test(extracted), `Invalid step format: "${input}"`);

    return parseInt(extracted, 10);
  }

  getSnapshot() {
    return this;
  }

  protected notify() {
    this.listeners.forEach((listener) => {
      listener({
        defaultNameTransformationCasing: this.defaultNameTransformationCasing,
        original: this.original,
        steps: this.steps,
        value: this.value,
      });
    });
  }

  /**
   * Gets the step data associated with the target step number.
   * @returns The step data for the target step number.
   */
  get<Step extends stepNumbers>(options: { step: Step }) {
    const { step } = options;
    const stepKey = `step${step}` as keyof resolvedStep;

    const data = this.value[stepKey] as GetCurrentStep<resolvedStep, Step>;

    return { step, data };
  }

  /**
   * Gets the data for the first step.
   * @returns The data for the first step.
   */
  first() {
    const firstStep = Math.min(...this.stepNumbers) as FirstStep<resolvedStep>;

    return this.get({ step: firstStep });
  }

  /**
   * Gets the data for the last step.
   * @returns The data for the last step.
   */
  last() {
    const lastStep = Math.max(...this.stepNumbers);

    return this.get<LastStep<resolvedStep>>({ step: lastStep as never });
  }

  private createStepUpdaterFnImpl<
    TargetStep extends stepNumbers,
    CurrentStepData extends GetCurrentStep<resolvedStep, TargetStep>,
    Field extends keyof CurrentStepData
  >(
    step: TargetStep,
    fieldOrUpdater: Field | Updater<CurrentStepData, Relaxed<CurrentStepData>>,
    updater:
      | Updater<CurrentStepData[Field], Relaxed<CurrentStepData[Field]>>
      | undefined
  ) {
    const steps = this.stepNumbers;

    invariant(
      typeof step === 'number',
      `Type of step must be a number, was ${typeof step}`,
      TypeError
    );
    invariant(
      steps.includes(step),
      `The target step ${step} is not valid. Valid steps include "${steps.join(
        ', '
      )}"`
    );

    const stepKey = `step${step}` as keyof resolvedStep;

    if (typeof fieldOrUpdater === 'string') {
      invariant(this.value[stepKey], `No data found for step ${step}`);

      invariant(
        typeof this.value[stepKey] === 'object',
        `The values for step ${step} is not an object, was ${typeof this.value[
          stepKey
        ]}`
      );
      invariant(
        fieldOrUpdater in this.value[stepKey],
        `The field ${fieldOrUpdater} is not a valid field. Valid fields include ${Object.keys(
          this.value[stepKey]
        ).join(', ')}`
      );
      const targetType =
        typeof this.value[stepKey][
          fieldOrUpdater as keyof (keyof ResolvedStep<step>)
        ];
      invariant(
        typeof updater === targetType,
        `The updater must be a "${targetType}", was "${typeof updater}"`,
        TypeError
      );

      this.value = {
        ...this.value,
        [stepKey]: {
          ...this.value[stepKey],
          [fieldOrUpdater]:
            typeof updater === 'function'
              ? (updater as Function)(
                  this.value[stepKey][
                    fieldOrUpdater as keyof (keyof resolvedStep)
                  ]
                )
              : updater,
        },
      };

      this.notify();
    } else if (
      typeof fieldOrUpdater === 'object' ||
      typeof fieldOrUpdater === 'function'
    ) {
      const updatedData =
        typeof fieldOrUpdater === 'function'
          ? fieldOrUpdater(this.value[stepKey] as CurrentStepData)
          : fieldOrUpdater;

      invariant(
        typeof updatedData === 'object',
        `The updated data must be an object, was ${typeof updatedData}`
      );

      this.value = {
        ...this.value,
        [stepKey]: {
          ...this.value[stepKey],
          ...updatedData,
        },
      };

      this.notify();
    } else {
      throw new TypeError(
        `The second parameter must be one of the following: a specific field to update (string), an object with the updated data, or a function that returns the updated data. It was ${typeof fieldOrUpdater}`,
        { cause: fieldOrUpdater }
      );
    }
  }

  private createStepUpdaterFn<TargetStep extends stepNumbers>(
    step: TargetStep
  ): UpdateStepFn<resolvedStep, stepNumbers, TargetStep, true>;
  private createStepUpdaterFn<TargetStep extends stepNumbers>(
    step: TargetStep
  ) {
    return <CurrentStepData extends GetCurrentStep<resolvedStep, TargetStep>>(
      fieldOrUpdater:
        | keyof CurrentStepData
        | Updater<CurrentStepData, Relaxed<CurrentStepData>>,
      updater: Updater<
        CurrentStepData[keyof CurrentStepData],
        Relaxed<CurrentStepData[keyof CurrentStepData]>
      >
    ) => {
      this.createStepUpdaterFnImpl(
        step,
        fieldOrUpdater as never,
        updater as never
      );
    };
  }

  /**
   * Update a specific field's data for the specified step.
   * @param step The step to update.
   * @param field The field to update.
   * @param updater The updated data for field.
   */
  // NOTE: This overload is first so that `field` gets autocomplete
  update<
    TargetStep extends stepNumbers,
    CurrentStepData extends GetCurrentStep<resolvedStep, TargetStep>,
    Field extends keyof CurrentStepData,
    TUpdater extends Updater<
      CurrentStepData[Field],
      Relaxed<CurrentStepData[Field]>
    >
  >(step: TargetStep, field: Field, updater: TUpdater): void;
  /**
   * Update the data for a specified step.
   * @param step The step to update.
   * @param updater The updated data for the step.
   */
  update<
    Step extends stepNumbers,
    CurrentStepData extends GetCurrentStep<resolvedStep, Step>,
    TUpdater extends Updater<CurrentStepData, Relaxed<CurrentStepData>>
  >(step: Step, updater: TUpdater): void;
  update<
    Step extends stepNumbers,
    CurrentStepData extends GetCurrentStep<resolvedStep, Step>,
    Field extends keyof CurrentStepData
  >(
    step: Step,
    fieldOrUpdater: Field | Updater<CurrentStepData, Relaxed<CurrentStepData>>,
    updater?: Updater<CurrentStepData[Field], Relaxed<CurrentStepData[Field]>>
  ) {
    this.createStepUpdaterFnImpl(step, fieldOrUpdater, updater);
  }

  private createStepHelperCtxHelper<
    ChosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(data: string[]) {
    return data.reduce((acc, curr) => {
      const stepNumber = this.extractNumberFromStep(curr);

      acc[curr as keyof typeof acc] = this.get({
        step: stepNumber as stepNumbers,
      }).data as never;

      return acc;
    }, {} as HelperFnCtx<resolvedStep, stepNumbers, ChosenSteps>);
  }

  protected createStepHelperCtx<
    ChosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: ChosenSteps) {
    const formatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'disjunction',
    });
    const validStepKeys = this.stepNumbers.map(
      (value) => `step${value}` as keyof resolvedStep
    );

    const baseErrorMessage = () => {
      return `"stepData" must be set to an array of available steps (${formatter.format(
        validStepKeys as string[]
      )})`;
    };

    if (stepData === 'all') {
      return this.stepNumbers.reduce((acc, curr) => {
        const stepKey = `step${curr}` as keyof HelperFnCtx<
          resolvedStep,
          stepNumbers,
          ChosenSteps
        >;
        acc[stepKey] = this.get({ step: curr as stepNumbers }).data as never;

        return acc;
      }, {} as HelperFnCtx<resolvedStep, stepNumbers, ChosenSteps>);
    }

    if (Array.isArray(stepData)) {
      invariant(
        stepData.every((step) =>
          validStepKeys.includes(step as keyof resolvedStep)
        ),
        () => {
          const comparedResults = comparePartialArray(
            stepData,
            this.stepNumbers,
            formatter
          );

          if (comparedResults.status === 'error') {
            return `${baseErrorMessage()}. See errors:\n ${printErrors(
              comparedResults.errors
            )}`;
          }

          return baseErrorMessage();
        }
      );

      return this.createStepHelperCtxHelper<ChosenSteps>(stepData);
    }

    if (typeof stepData === 'object') {
      const keys = Object.keys(stepData);

      invariant(
        keys.every((key) => validStepKeys.includes(key as keyof resolvedStep)),
        () => {
          const comparedResults = comparePartialArray(
            keys,
            validStepKeys as string[],
            formatter
          );

          if (comparedResults.status === 'error') {
            return `${baseErrorMessage()}. See errors:\n ${printErrors(
              comparedResults.errors
            )}`;
          }

          return baseErrorMessage();
        }
      );

      return this.createStepHelperCtxHelper<ChosenSteps>(keys);
    }

    throw new Error(`${baseErrorMessage()} OR to "all"`);
  }

  private createStepHelperFnImpl<
    ChosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: ChosenSteps) {
    return <Validator, Response>(
      optionsOrFunction:
        | Omit<
            CreateHelperFunctionOptionsWithValidator<
              resolvedStep,
              stepNumbers,
              ChosenSteps,
              Validator
            >,
            'stepData'
          >
        | Omit<
            CreateHelperFunctionOptionsWithoutValidator<
              resolvedStep,
              stepNumbers,
              ChosenSteps
            >,
            'stepData'
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
            ChosenSteps,
            Response
          >,
      fn:
        | HelperFnWithValidator<
            resolvedStep,
            stepNumbers,
            ChosenSteps,
            Validator,
            Response
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
            ChosenSteps,
            Response
          >
    ) => {
      const ctx = this.createStepHelperCtx(stepData);

      if (typeof optionsOrFunction === 'function') {
        return () => optionsOrFunction({ ctx });
      }

      if (typeof optionsOrFunction === 'object') {
        return (
          input?: Expand<
            Omit<
              HelperFnInputWithValidator<
                resolvedStep,
                stepNumbers,
                ChosenSteps,
                Validator
              >,
              'ctx'
            >
          >
        ) => {
          if ('validator' in optionsOrFunction) {
            invariant(
              typeof input === 'object',
              'An input is expected since you provided a validator'
            );

            runStandardValidation(
              optionsOrFunction.validator as StandardSchemaValidator,
              input.data
            );

            return fn({ ctx, ...input });
          }

          return (
            fn as HelperFnWithoutValidator<
              resolvedStep,
              stepNumbers,
              ChosenSteps,
              Response
            >
          )({ ctx });
        };
      }

      throw new Error(
        `The first argument must be a function or an object, (was ${typeof optionsOrFunction})`
      );
    };
  }

  private createStepHelperFn<TargetStep extends stepNumbers>(step: TargetStep) {
    return this.createStepHelperFnImpl([`step${step}`]);
  }

  /**
   * Create a helper function with validated input.
   */
  createHelperFn<
    ChosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    Validator,
    Response
  >(
    options: CreateHelperFunctionOptionsWithValidator<
      resolvedStep,
      stepNumbers,
      ChosenSteps,
      Validator
    >,
    fn: HelperFnWithValidator<
      resolvedStep,
      stepNumbers,
      ChosenSteps,
      Validator,
      Response
    >
  ): CreatedHelperFnWithInput<
    resolvedStep,
    stepNumbers,
    ChosenSteps,
    Validator,
    Response
  >;
  /**
   * Create a helper function without input.
   */
  createHelperFn<
    ChosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    Response
  >(
    options: CreateHelperFunctionOptionsWithoutValidator<
      resolvedStep,
      stepNumbers,
      ChosenSteps
    >,
    fn: HelperFnWithoutValidator<
      resolvedStep,
      stepNumbers,
      ChosenSteps,
      Response
    >
  ): CreatedHelperFnWithoutInput<Response>;
  // Implementation
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    response,
    validator = never
  >(
    options:
      | CreateHelperFunctionOptionsWithValidator<
          resolvedStep,
          stepNumbers,
          chosenSteps,
          validator
        >
      | CreateHelperFunctionOptionsWithoutValidator<
          resolvedStep,
          stepNumbers,
          chosenSteps
        >,
    fn:
      | HelperFnWithValidator<
          resolvedStep,
          stepNumbers,
          chosenSteps,
          validator,
          response
        >
      | HelperFnWithoutValidator<
          resolvedStep,
          stepNumbers,
          chosenSteps,
          response
        >
  ) {
    const { stepData, ...rest } = options;

    return this.createStepHelperFnImpl(stepData)(rest, fn);
  }
}
