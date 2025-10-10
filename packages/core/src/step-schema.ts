import { casing } from '@multi-step-form/casing';
import type { types } from '@multi-step-form/compile-time-utils';
import {
  invariant,
  runStandardValidation,
  type AnyValidator,
  type DefaultValidator,
  type StandardSchemaValidator,
} from '@multi-step-form/runtime-utils';
import {
  DEFAULT_FIELD_TYPE,
  MultiStepFormStepHelper,
  step,
  type AnyResolvedStep,
  type AnyStepField,
  type CreatedHelperFnWithInput,
  type CreatedHelperFnWithoutInput,
  type CreateHelperFunctionOptionsWithoutValidator,
  type CreateHelperFunctionOptionsWithValidator,
  type CreateStepHelperFn,
  type DefaultCasing,
  type ExtractStepFromKey,
  type FirstStep,
  type GetCurrentStep,
  type HelperFnChosenSteps,
  type HelperFnWithoutValidator,
  type HelperFnWithValidator,
  type InferStepOptions,
  type Join,
  type LastStep,
  type MultiStepFormSchemaStepConfig,
  type Relaxed,
  type ResolvedStep,
  type Step,
  type StepData,
  type StepNumbers,
  type UnionToTuple,
  type Updater,
  type UpdateStepFn,
} from '@multi-step-form/shared-utils';
import { Subscribable } from './subscribable';

export type CasingType = casing.CasingType;
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
  stepNumbers extends ExtractStepFromKey<
    types.Constrain<keyof resolvedStep, string>
  >
> = {
  // Exclude is needed due to all the Constrains
  string: Exclude<
    Join<
      types.Constrain<
        Quote<types.Constrain<UnionToTuple<`${stepNumbers}`>, string[]>>,
        string[]
      >,
      ' | '
    >,
    ''
  >;
  number: Exclude<
    Join<types.Constrain<UnionToTuple<`${stepNumbers}`>, string[]>, ' | '>,
    ''
  >;
  'array.string': UnionToTuple<`${stepNumbers}`>;
};
export type AsFunctionReturn<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends ExtractStepFromKey<
    types.Constrain<keyof resolvedStep, string>
  >,
  asType extends AsType
> = AsTypeMap<resolvedStep, stepNumbers>[asType];
export type AsFunction<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends ExtractStepFromKey<
    types.Constrain<keyof resolvedStep, string>
  >
> = <asType extends AsType>(
  asType: asType
) => AsFunctionReturn<resolvedStep, stepNumbers, asType>;
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
  return label ?? casing.changeCasing(fieldName, casingType);
}

function createStepFields(options: {
  fields: AnyStepField;
  validateFields:
    | types.Constrain<unknown, AnyValidator, DefaultValidator>
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
      nameTransformCasing: defaultCasing = casing.DEFAULT_CASING,
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
  /**
   * Gets the step data for the target step.
   */
  get: ReturnType<typeof step.get<step, resolvedStep, stepNumbers, casing>>;
  readonly steps: MultiStepFormStepStepsConfig<resolvedStep, stepNumbers>;
  readonly defaultNameTransformationCasing: casing;
  //@ts-ignore
  private readonly firstStep: StepData<resolvedStep, FirstStep<resolvedStep>>;
  private readonly lastStep: StepData<resolvedStep, LastStep<resolvedStep>>;
  private readonly stepNumbers: Array<number>;
  private readonly stepHelper: MultiStepFormStepHelper<
    step,
    resolvedStep,
    stepNumbers,
    casing
  >;

  constructor(
    config: MultiStepFormSchemaStepConfig<
      step,
      types.Constrain<casing, CasingType>
    >
  ) {
    super();

    const { steps, nameTransformCasing } = config;

    this.defaultNameTransformationCasing = casing.setCasingType(
      nameTransformCasing,
      casing.DEFAULT_CASING
    ) as casing;

    this.original = steps;
    this.value = createStep<step, resolvedStep, casing>(this.original);
    this.get = step.get<step, resolvedStep, stepNumbers, casing>(this.value);
    this.stepNumbers = Object.keys(this.value).map((key) =>
      parseInt(key.replace('step', ''))
    );
    this.stepHelper = new MultiStepFormStepHelper(
      this.value,
      this.stepNumbers as Array<stepNumbers>
    );

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

  // private extractNumberFromStep(input: string) {
  //   invariant(
  //     input.includes('step'),
  //     "Can't extract a valid step number since"
  //   );

  //   const extracted = input.replace('step', '');

  //   invariant(/^\d+$/.test(extracted), `Invalid step format: "${input}"`);

  //   return parseInt(extracted, 10);
  // }

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

  private createStepHelperFn<TargetStep extends stepNumbers>(step: TargetStep) {
    return this.stepHelper.createStepHelperFnImpl([`step${step}`]);
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

    return this.stepHelper.createStepHelperFnImpl(stepData)(rest, fn);
  }
}
