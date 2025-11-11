import {
  DEFAULT_STORAGE_KEY,
  DefaultStorageKey,
  MultiStepFormStorage,
} from '@/storage';
import {
  DEFAULT_CASING,
  DEFAULT_FIELD_TYPE,
  changeCasing,
  isCasingValid,
  isFieldType,
  setCasingType,
  type CasingType,
  type Constrain,
  type DefaultCasing,
  type Expand,
} from '@/utils';
import { invariant } from '@/utils/invariant';
import {
  runStandardValidation,
  type AnyValidator,
  type DefaultValidator,
  type StandardSchemaValidator,
} from '@/utils/validator';
import { Subscribable } from '../subscribable';
import type {
  AnyResolvedStep,
  AnyStepField,
  AnyStepFieldOption,
  CreateHelperFunctionOptionsWithValidator,
  CreateHelperFunctionOptionsWithoutValidator,
  CreateStepHelperFn,
  CreatedHelperFnWithInput,
  CreatedHelperFnWithoutInput,
  ExtractStepFromKey,
  FirstStep,
  GetCurrentStep,
  HelperFnChosenSteps,
  HelperFnInputWithValidator,
  HelperFnWithValidator,
  HelperFnWithoutValidator,
  InferStepOptions,
  Join,
  LastStep,
  MultiStepFormSchemaStepConfig,
  Relaxed,
  ResolvedFields,
  ResolvedStep,
  Step,
  StepData,
  StepNumbers,
  StepOptions,
  UnionToTuple,
  UpdateStepFn,
  Updater,
} from './types';
import {
  createCtx,
  functionalUpdate,
  getStep,
  type GetStepOptions,
} from './utils';

export interface MultiStepFormStepSchemaFunctions<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> {
  update: UpdateStepFn<TResolvedStep, TStepNumbers>;
  createHelperFn: CreateStepHelperFn<TResolvedStep, TStepNumbers>;
}
export type AsType = (typeof AS_TYPES)[number];
type Quote<T extends string[]> = {
  [K in keyof T]: T[K] extends string ? `'${T[K]}'` : never;
};
export type AsTypeMap<
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
  'array.string.untyped': string[];
};
export type AsFunctionReturn<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends ExtractStepFromKey<Constrain<keyof resolvedStep, string>>,
  asType extends AsType
> = AsTypeMap<resolvedStep, stepNumbers>[asType];
export type AsFunction<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends ExtractStepFromKey<Constrain<keyof resolvedStep, string>>
> = <asType extends AsType>(
  asType: asType
) => AsFunctionReturn<resolvedStep, stepNumbers, asType>;
export type MultiStepFormStepStepsConfig<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TResolvedStep extends ResolvedStep<TStep, TCasing> = ResolvedStep<
    TStep,
    TCasing
  >,
  TStepNumbers extends StepNumbers<TResolvedStep> = StepNumbers<TResolvedStep>
> = {
  first: FirstStep<TResolvedStep>;
  last: LastStep<TResolvedStep>;
  value: ReadonlyArray<TStepNumbers>;
  as: AsFunction<TResolvedStep, TStepNumbers>;
  isValidStepNumber: (stepNumber: number) => stepNumber is TStepNumbers;
  isValidStepKey: (
    value: string
  ) => value is Constrain<keyof TResolvedStep, string>;
};
export type MultiStepFormStepSchemaListener<
  TStep extends Step<TCasing>,
  TCasing extends CasingType
> = (data: {
  original: InferStepOptions<TStep>;
  value: ResolvedStep<TStep, TCasing>;
  steps: MultiStepFormStepStepsConfig<TStep, TCasing>;
  defaultNameTransformationCasing: TCasing;
}) => void;

/**
 * Available transformation types for the step numbers.
 */
const AS_TYPES = [
  'string',
  'number',
  'array.string',
  'array.string.untyped',
] as const;
export const VALIDATED_STEP_REGEX = /^step\d+$/i;

type ValueCheck<T> = (v: unknown) => v is T;

type FieldChecks<T extends object> = {
  [K in keyof T]: ValueCheck<T[K]>;
};

function assertObjectFields<T extends object>(
  obj: unknown,
  checks: FieldChecks<T>
): obj is T {
  if (typeof obj !== 'object' || obj === null) return false;

  for (const key of Object.keys(checks) as (keyof T)[]) {
    // Check that the property exists
    if (!(key in obj)) return false;

    // Now check the type
    const checkFn = checks[key];
    const value = (obj as any)[key];
    if (!checkFn(value)) return false;
  }

  return true;
}

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
  casing extends CasingType = DefaultCasing
>(stepsConfig: InferStepOptions<step>) {
  const resolvedSteps = {} as ResolvedStep<step, casing>;

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

    const validStepKey = stepKey as keyof typeof resolvedSteps;
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
    casing extends CasingType = DefaultCasing,
    resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<
      step,
      casing
    >,
    stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>,
    storageKey extends string = DefaultStorageKey
  >
  extends Subscribable<MultiStepFormStepSchemaListener<step, casing>>
  implements MultiStepFormStepSchemaFunctions<resolvedStep, stepNumbers>
{
  /**
   * The original config before any validation or transformations have been applied.
   */
  readonly original: InferStepOptions<step>;
  /**
   * The resolved step values.
   */
  value: resolvedStep;
  readonly steps: MultiStepFormStepStepsConfig<step, casing>;
  readonly defaultNameTransformationCasing: casing;
  //@ts-ignore
  private readonly firstStep: StepData<resolvedStep, FirstStep<resolvedStep>>;
  private readonly lastStep: StepData<resolvedStep, LastStep<resolvedStep>>;
  private readonly stepNumbers: Array<number>;
  private readonly storage: MultiStepFormStorage<resolvedStep, storageKey>;

  constructor(
    config: MultiStepFormSchemaStepConfig<
      step,
      Constrain<casing, CasingType>,
      storageKey
    >
  ) {
    super();

    const { steps, nameTransformCasing, storage } = config;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing
    ) as casing;

    this.original = steps;

    this.value = this.enrichValues(createStep(this.original) as resolvedStep);
    this.stepNumbers = Object.keys(this.value).map((key) =>
      Number.parseInt(key.replace('step', ''))
    );

    this.storage = new MultiStepFormStorage<resolvedStep, storageKey>({
      data: this.value,
      key: (storage?.key ?? DEFAULT_STORAGE_KEY) as storageKey,
      store: storage?.store,
    });
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

        if (asType.includes('array.string')) {
          return this.stepNumbers.map((value) => `${value}`);
        }

        throw new Error(
          `Transformation type "${asType}" is not supported. Available transformations include: ${AS_TYPES.map(
            (value) => `"${value}"`
          ).join(', ')}`
        );
      },
      isValidStepNumber: (stepNumber): stepNumber is stepNumbers =>
        this.stepNumbers.includes(stepNumber),
      isValidStepKey: (
        stepKey
      ): stepKey is Constrain<keyof resolvedStep, string> =>
        Object.keys(this.value).includes(stepKey),
    };
  }

  getSnapshot() {
    return this;
  }

  protected notify() {
    for (const listener of this.listeners) {
      listener({
        defaultNameTransformationCasing: this.defaultNameTransformationCasing,
        original: this.original,
        steps: this.steps,
        value: this.value,
      });
    }
  }

  protected enrichValues<
    values extends AnyResolvedStep,
    additionalProps extends object
  >(values: values, additionalProps?: (step: number) => additionalProps) {
    for (const [key, stepValue] of Object.entries(values)) {
      const step = Number.parseInt(key.replace('step', '')) as stepNumbers;

      values = {
        ...values,
        [key as keyof resolvedStep]: {
          ...(stepValue as object),
          update: this.createStepUpdaterFn(step),
          createHelperFn: this.createStepHelperFn(step),
          ...additionalProps?.(step),
        },
      };
    }

    return values;
  }

  /**
   * Gets the data for a specific step.
   * @param options The options for getting the step data.
   * @returns The step data for the target step.
   */
  get<stepNumber extends stepNumbers>(
    options: GetStepOptions<resolvedStep, stepNumbers, stepNumber>
  ) {
    return getStep(this.value)(options);
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

  private handlePostUpdate() {
    this.storage.add(this.value);
    this.notify();
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
      // invariant(
      //   typeof updater === 'object' || typeof updater === 'function',
      //   () => {
      //     let targetUpdaterTypeMsg = '';

      //     if (typeof updater !== 'object') {
      //       targetUpdaterTypeMsg = 'an object';
      //     }

      //     if (typeof updater !== 'function') {
      //       targetUpdaterTypeMsg = 'a function';
      //     }

      //     return `[${String(
      //       stepKey
      //     )}-${fieldOrUpdater}]: The updater must be ${targetUpdaterTypeMsg}, was "${typeof updater}"`;
      //   },
      //   TypeError
      // );

      this.value = {
        ...this.value,
        [stepKey]: {
          ...this.value[stepKey],
          [fieldOrUpdater]: functionalUpdate(
            updater,
            this.value[stepKey][
              fieldOrUpdater as keyof (keyof resolvedStep)
            ] as CurrentStepData[Field]
          ),
        },
      };

      this.handlePostUpdate();

      return;
    }

    if (
      typeof fieldOrUpdater === 'object' ||
      typeof fieldOrUpdater === 'function'
    ) {
      const updatedData = functionalUpdate(
        fieldOrUpdater,
        this.value[stepKey] as CurrentStepData
      );

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

      this.handlePostUpdate();

      return;
    }

    throw new TypeError(
      `The second parameter must be one of the following: a specific field to update (string), an object with the updated data, or a function that returns the updated data. It was ${typeof fieldOrUpdater}`,
      { cause: fieldOrUpdater }
    );
  }

  protected createStepUpdaterFn<TargetStep extends stepNumbers>(
    step: TargetStep
  ): UpdateStepFn<resolvedStep, stepNumbers, TargetStep, true>;
  protected createStepUpdaterFn<TargetStep extends stepNumbers>(
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

  private createStepHelperFnImpl<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: chosenSteps) {
    return <Validator, Response>(
      optionsOrFunction:
        | Omit<
            CreateHelperFunctionOptionsWithValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps,
              Validator
            >,
            'stepData'
          >
        | Omit<
            CreateHelperFunctionOptionsWithoutValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps
            >,
            'stepData'
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            Response
          >,
      fn:
        | HelperFnWithValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            Validator,
            Response
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            Response
          >
    ) => {
      const ctx = createCtx<resolvedStep, stepNumbers, chosenSteps>(
        this.value,
        stepData
      );

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
                chosenSteps,
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
              chosenSteps,
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

    return this.createStepHelperFnImpl(stepData as never)(rest, fn);
  }

  /**
   * Validates that a given object is the proper shape for step data.
   * @param value
   */
  static hasData<
    step extends Step<casing>,
    resolvedStep extends ResolvedStep<step, casing>,
    stepNumbers extends StepNumbers<resolvedStep>,
    casing extends CasingType = DefaultCasing
  >(
    value: unknown,
    options?: {
      optionalKeysToCheck?: FieldChecks<
        Pick<StepOptions, 'description' | 'validateFields'>
      >;
    }
  ): value is GetCurrentStep<resolvedStep, stepNumbers> {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    return assertObjectFields<
      | GetCurrentStep<resolvedStep, stepNumbers>
      | (Omit<StepOptions, 'fields'> & {
          fields: Expand<
            ResolvedFields<InferStepOptions<step>, keyof InferStepOptions<step>>
          >;
        })
    >(value, {
      title: (v) => typeof v === 'string',
      fields: (
        v
      ): v is Expand<
        ResolvedFields<InferStepOptions<step>, keyof InferStepOptions<step>>
      > => {
        if (v === null || typeof v !== 'object') {
          return false;
        }

        for (const key of Object.keys(v)) {
          if (typeof key !== 'string' || !(key in v)) {
            return false;
          }

          const current = (v as Record<string, unknown>)[key];

          if (current === null || typeof current !== 'object') {
            return false;
          }

          const hasField = assertObjectFields<AnyStepFieldOption>(current, {
            defaultValue: (v): v is {} => v !== 'undefined' && v !== null,
            label: (v) =>
              typeof v === 'string' || (typeof v === 'boolean' && !v),
            nameTransformCasing: isCasingValid,
            type: isFieldType,
          });

          if (!hasField) {
            return false;
          }
        }

        return true;
      },
      createHelperFn: (
        v
      ): v is GetCurrentStep<resolvedStep, stepNumbers>['createHelperFn'] =>
        typeof v === 'function',
      update: (v): v is GetCurrentStep<resolvedStep, stepNumbers>['update'] =>
        typeof v === 'function',
      nameTransformCasing: isCasingValid,
      ...options?.optionalKeysToCheck,
    });
  }
}
