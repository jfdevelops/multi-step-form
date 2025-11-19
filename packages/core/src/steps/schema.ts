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
  type Join,
} from '@/utils';
import { comparePartialArray, printErrors } from '@/utils/helpers';
import { invariant } from '@/utils/invariant';
import { path } from '@/utils/path';
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
  CreateHelperFunctionOptionsWithCustomCtxOptions,
  CreateHelperFunctionOptionsWithValidator,
  CreateHelperFunctionOptionsWithoutValidator,
  CreateStepHelperFn,
  CreatedHelperFnInput,
  CreatedHelperFnWithInput,
  CreatedHelperFnWithoutInput,
  ExtractStepFromKey,
  FirstStep,
  GetCurrentStep,
  HelperFnChosenSteps,
  HelperFnCtx,
  HelperFnWithValidator,
  HelperFnWithoutValidator,
  InferStepOptions,
  LastStep,
  MultiStepFormSchemaStepConfig,
  ResolvedFields,
  ResolvedStep,
  Step,
  StepData,
  StepNumbers,
  StepOptions,
  UnionToTuple,
  UpdateFn,
  ValidStepKey,
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
  update: UpdateFn.general<TResolvedStep, TStepNumbers>;
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
          update: this.createStepUpdaterFn(key as ValidStepKey<stepNumbers>),
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
    targetStep extends ValidStepKey<stepNumbers>,
    fields extends UpdateFn.chosenFields<currentStep>,
    additionalCtx extends Record<string, unknown>,
    currentStep extends UpdateFn.resolvedStep<
      resolvedStep,
      stepNumbers,
      targetStep
    >
  >(
    options: UpdateFn.options<
      resolvedStep,
      stepNumbers,
      targetStep,
      fields,
      additionalCtx,
      currentStep
    >
  ) {
    const { targetStep, updater, ctxData, fields = 'all' } = options;

    invariant(
      this.steps.isValidStepKey(targetStep),
      `[update]: The target step ${targetStep} isn't a valid step. Please select a valid step`
    );

    const { [targetStep]: currentStep, ...values } = this.value;

    let ctx = createCtx(this.value, [targetStep]);

    // Build the `ctx` first
    if (ctxData) {
      invariant(
        typeof ctxData === 'function',
        '[update]: "ctxData" must be a function'
      );

      const additionalCtx = ctxData({ ctx: values as never });

      invariant(
        typeof additionalCtx === 'object' &&
          Object.keys(additionalCtx).length > 0,
        '[update]: "ctxData" must return an object with keys'
      );

      ctx = {
        ...ctx,
        ...additionalCtx,
      };
    }

    const updated = functionalUpdate(updater, {
      ctx: ctx as never,
    });

    // TODO validate `updater` - will have to be done in each case (I think)

    // default case: updating all fields for the current step
    if (!fields) {
      invariant(
        typeof updated === 'object',
        '[update]: "updater" must be an object or a function that returns an object'
      );

      const stepKeys = Object.keys(this.value);
      const updaterResultKeys = Object.keys(updated as Record<string, unknown>);

      invariant(updaterResultKeys.length === stepKeys.length, () => {
        const missingKeys = stepKeys.filter(
          (key) => !updaterResultKeys.includes(key)
        );
        const formatter = new Intl.ListFormat('en', {
          style: 'long',
          type: 'conjunction',
        });

        return `[update]: "updater" is missing keys ${formatter.format(
          missingKeys
        )}`;
      });
      const paths = path.createDeep(this.value);

      const { mismatches, ok } = path.equalsAtPaths(
        this.value,
        paths,
        updated as never
      );

      invariant(
        ok && mismatches.length === 0,
        `[update]: found value mismatches in ${path.printMismatches({
          mismatches,
          ok,
        })}`
      );

      this.value = {
        ...this.value,
        [targetStep]: path.updateAt(this.value, paths, updated as never),
      };

      this.handlePostUpdate();

      return;
    }

    const currentStepDeepKeys = path.createDeep(currentStep);

    if (Array.isArray(fields)) {
      const compareResult = comparePartialArray(currentStepDeepKeys, fields);

      invariant(
        compareResult.status === 'success',
        `[update]: Found errors with the provided fields\n${
          compareResult.status === 'error'
            ? printErrors(compareResult.errors)
            : ''
        }`
      );

      const { mismatches, ok } = path.equalsAtPaths(
        currentStep,
        fields,
        updated as never
      );

      invariant(
        ok && mismatches.length === 0,
        `[update]: found value mismatches in ${path.printMismatches({
          ok,
          mismatches,
        })}`
      );

      this.value = {
        ...this.value,
        [targetStep]: path.updateAt(currentStep, fields, updated as never),
      };

      this.handlePostUpdate();

      return;
    }

    if (typeof fields === 'object' && Object.keys(fields).length > 0) {
      const keys = path.createDeep(fields);
      const compareResult = comparePartialArray(
        currentStepDeepKeys,
        keys as never
      );

      invariant(
        compareResult.status === 'success',
        `[update]: Found errors with the provided fields\n${
          compareResult.status === 'error'
            ? printErrors(compareResult.errors)
            : ''
        }`
      );

      // TODO validate all values (deepest) are `true`
      const { mismatches, ok } = path.equalsAtPaths(
        currentStep,
        keys as never,
        updated as never
      );

      invariant(
        ok && mismatches.length === 0,
        `[update]: found value mismatches in ${path.printMismatches({
          ok,
          mismatches,
        })}`
      );

      this.value = {
        ...this.value,
        [targetStep]: path.updateAt(
          currentStep,
          keys as never,
          updated as never
        ),
      };

      this.handlePostUpdate();

      return;
    }

    throw new TypeError(
      `[update]: property "fields" must be set to one of the following: "all", an array of deep paths to update, or an object of paths. Was ${typeof updater}`,
      { cause: updater }
    );
  }

  protected createStepUpdaterFn<targetStep extends ValidStepKey<stepNumbers>>(
    targetStep: targetStep
  ): UpdateFn.stepSpecific<resolvedStep, stepNumbers, targetStep> {
    return (options) => {
      this.createStepUpdaterFnImpl({ targetStep, ...options });
    };
  }

  update<
    targetStep extends ValidStepKey<stepNumbers>,
    field extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<resolvedStep, stepNumbers, targetStep>
    > = 'all',
    additionalCtx extends Record<string, unknown> = {}
  >(
    options: UpdateFn.options<
      resolvedStep,
      stepNumbers,
      targetStep,
      field,
      additionalCtx
    >
  ) {
    this.createStepUpdaterFnImpl(options);
  }

  private createStepHelperFnImpl<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: chosenSteps) {
    return <validator, additionalCtx extends Record<string, unknown>, response>(
      optionsOrFunction:
        | Omit<
            CreateHelperFunctionOptionsWithValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps,
              validator,
              additionalCtx
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
            additionalCtx,
            response
          >,
      fn:
        | HelperFnWithValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            validator,
            additionalCtx,
            response
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            additionalCtx,
            response
          >
    ) => {
      const ctx = createCtx<resolvedStep, stepNumbers, chosenSteps>(
        this.value,
        stepData
      ) as never;

      if (typeof optionsOrFunction === 'function') {
        return () => optionsOrFunction({ ctx });
      }

      if (typeof optionsOrFunction === 'object') {
        return (input?: CreatedHelperFnInput<validator>) => {
          if ('validator' in optionsOrFunction) {
            invariant(
              typeof input === 'object',
              'An input is expected since you provided a validator'
            );

            runStandardValidation(
              optionsOrFunction.validator as StandardSchemaValidator,
              input.data
            );

            let resolvedCtx = ctx as HelperFnCtx<
              resolvedStep,
              stepNumbers,
              chosenSteps
            >;

            if (optionsOrFunction.ctxData) {
              const currentStepKey = (
                stepData as HelperFnChosenSteps.tupleNotation<
                  ValidStepKey<stepNumbers>
                >
              )[0] as keyof resolvedStep;
              const { [currentStepKey]: _, ...values } = this.value;

              resolvedCtx = {
                ...resolvedCtx,
                ...optionsOrFunction.ctxData({ ctx: values as never }),
              };
            }

            return fn({ ctx: resolvedCtx as never, ...input });
          }

          return (
            fn as HelperFnWithoutValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps,
              additionalCtx,
              response
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
    const chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    validator,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: CreateHelperFunctionOptionsWithValidator<
      resolvedStep,
      stepNumbers,
      chosenSteps,
      validator,
      additionalCtx
    >,
    fn: HelperFnWithValidator<
      resolvedStep,
      stepNumbers,
      chosenSteps,
      validator,
      additionalCtx,
      response
    >
  ): CreatedHelperFnWithInput<validator, response>;
  /**
   * Create a helper function without input.
   */
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: CreateHelperFunctionOptionsWithoutValidator<
      resolvedStep,
      stepNumbers,
      chosenSteps
    > &
      CreateHelperFunctionOptionsWithCustomCtxOptions<
        resolvedStep,
        stepNumbers,
        chosenSteps,
        additionalCtx
      >,
    fn: HelperFnWithoutValidator<
      resolvedStep,
      stepNumbers,
      chosenSteps,
      additionalCtx,
      response
    >
  ): CreatedHelperFnWithoutInput<response>;
  // Implementation
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    response,
    additionalCtx extends Record<string, unknown>,
    validator = never
  >(
    options:
      | CreateHelperFunctionOptionsWithValidator<
          resolvedStep,
          stepNumbers,
          chosenSteps,
          validator,
          additionalCtx
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
          additionalCtx,
          response
        >
      | HelperFnWithoutValidator<
          resolvedStep,
          stepNumbers,
          chosenSteps,
          additionalCtx,
          response
        >
  ) {
    const { stepData, ...rest } = options;

    return this.createStepHelperFnImpl(stepData)(rest, fn);
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
      // update: (v): v is GetCurrentStep<resolvedStep, stepNumbers>['update'] =>
      //   typeof v === 'function',
      nameTransformCasing: isCasingValid,
      ...options?.optionalKeysToCheck,
    });
  }
}
