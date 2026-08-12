import {
  MultiStepFormStepSchemaInternal,
  type StepSchema,
} from '@/internals/step-schema';
import { InvalidFieldError } from '@/errors/invalid-field';
import { InvalidInternalStateError } from '@/errors/invalid-internal-state';
import { InvalidStepError } from '@/errors/invalid-step';
import { InvalidTransformationError } from '@/errors/invalid-transformation';
import { DEFAULT_STORAGE_KEY, MultiStepFormStorage } from '@/storage';
import {
  setCasingType,
  type Constrain,
  type Join,
  type UnionToTuple,
} from '@/utils';
import { addToTuple, mapToTuple } from '@/utils/helpers';
import { Subscribable } from '../subscribable';
import {
  getDefaultValues,
  resolvedDeepPath,
  type getFieldForStep,
  type getDeepFields,
} from './fields';

import type { HelperFnChosenSteps } from './fn-utils/helper-fn';
import type {
  GeneralHelperFn,
  HelperFnInput,
  HelperFnOptions,
  HelperFnOutput,
} from './fn-utils/helper-fn/utils';
import type { ResetFn } from './fn-utils/reset-fn';
import type { UpdateFn } from './fn-utils/update-fn';
import {
  type AnyConfig,
  instantiateSteps,
  isValidSteps,
  type StepResolvedData,
  type StepConfig,
  type StepNumbers,
} from './steps';
import { getStep, type ExtractStepFromKey, type GetStepOptions } from './utils';

export interface MultiStepFormStepSchemaFunctions<
  value extends instantiateSteps,
> {
  update: UpdateFn.general<value>;
  reset: ResetFn.general<value>;
  createHelperFn: GeneralHelperFn<value>;
}
export type OverrideStatus = 'idle' | 'loading' | 'resolved' | 'error';

type StepOverrideResolutionState = {
  status: OverrideStatus;
  error?: unknown;
  promise?: Promise<void>;
};
export type AsType = (typeof AS_TYPES)[number];
type Quote<T extends string[]> = {
  [K in keyof T]: T[K] extends string ? `'${T[K]}'` : never;
};
export interface AsMethods<parsed extends string | number> {
  /**
   * Checks whether the provided value is one of the valid transformed values.
   */
  allows(value: unknown): value is parsed;
  /**
   * Parses a single transformed value and throws if it is not valid.
   */
  parse(value: unknown): parsed;
}
export type AsArrayAllows<parsed extends string | number> = ((
  value: unknown,
) => boolean) & {
  /**
   * Checks whether the provided value is one of the valid members of the transformed array.
   */
  in(value: unknown): value is parsed;
};
export type AsArrayParse<
  values extends ReadonlyArray<unknown>,
  parsed extends string | number,
> = ((value: unknown) => values) & {
  /**
   * Parses a single member of the transformed array and throws if it is not valid.
   */
  in(value: unknown): parsed;
};
export interface AsArrayMethods<
  values extends ReadonlyArray<unknown>,
  parsed extends string | number,
> {
  /**
   * Checks whether the provided value is an exact array match for the transformed values.
   * Order does not matter, but the array contents must match exactly.
   */
  allows: AsArrayAllows<parsed>;
  /**
   * Parses an exact array match for the transformed values and throws if it is not valid.
   * Order does not matter, but the array contents must match exactly.
   */
  parse: AsArrayParse<values, parsed>;
}
export type AsValue<value> = {
  /**
   * The value of the transformation.
   */
  value: value;
};
export type AsScalarValue<
  expression extends string,
  parsed extends string | number,
> = AsMethods<parsed> & AsValue<expression>;
export type AsArrayValue<
  values extends ReadonlyArray<unknown>,
  parsed extends string | number,
> = AsArrayMethods<values, parsed> & AsValue<values>;
export type AsTypeMap<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
  stepNumbers extends StepNumbers<value> = StepNumbers<value>,
> = {
  // Exclude is needed due to all the Constrains
  string: AsScalarValue<
    Exclude<
      Join<
        Constrain<
          Quote<
            Constrain<
              UnionToTuple<`${ExtractStepFromKey<stepNumbers>}`>,
              string[]
            >
          >,
          string[]
        >,
        ' | '
      >,
      ''
    >,
    `${ExtractStepFromKey<stepNumbers>}`
  >;
  'string.keys': AsScalarValue<
    Exclude<
      Join<
        Constrain<
          Quote<Constrain<UnionToTuple<`${stepNumbers}`>, string[]>>,
          string[]
        >,
        ' | '
      >,
      ''
    >,
    stepNumbers
  >;
  number: AsScalarValue<
    Exclude<
      Join<
        Constrain<UnionToTuple<`${ExtractStepFromKey<stepNumbers>}`>, string[]>,
        ' | '
      >,
      ''
    >,
    ExtractStepFromKey<stepNumbers>
  >;
  'array.number': AsArrayValue<
    Array<ExtractStepFromKey<stepNumbers>>,
    ExtractStepFromKey<stepNumbers>
  >;
  'array.string': AsArrayValue<
    Array<`${ExtractStepFromKey<stepNumbers>}`>,
    `${ExtractStepFromKey<stepNumbers>}`
  >;
  'array.string.keys': AsArrayValue<
    Array<`${stepNumbers}`>,
    stepNumbers
  >;
  'array.string.untyped': AsArrayValue<string[], string>;
};
export type AsFunctionReturn<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
  asType extends AsType,
> = AsTypeMap<def, value>[asType];
export type AsFunction<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
> = <asType extends AsType>(
  asType: asType,
) => AsFunctionReturn<def, value, asType>;

export type IsValidStepFn<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
> = {
  /**
   * Checks if a given string is a valid step key.
   */
  (value: string): value is StepNumbers<value>;
  /**
   * Checks if a given number is a valid step number.
   */
  (value: number): value is ExtractStepFromKey<StepNumbers<value>>;
};
export type MultiStepFormStepStepsConfig<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
> = {
  value: ReadonlyArray<StepNumbers<value>>;
  /**
   * Transforms the current step numbers into a requested shape.
   *
   * Scalar variants expose `parse()` and `allows()` for single values.
   * Array variants expose `parse()` and `allows()` for whole-array validation,
   * plus `parse.in()` and `allows.in()` for individual member checks.
   */
  as: AsFunction<def, value>;
  isValidStep: IsValidStepFn<def, value>;
};

const STRING_KEYS = ['string', 'string.keys'] as const;
const NUMBER_KEYS = ['number'] as const;
const ARRAY_STRING_KEYS = addToTuple(
  mapToTuple(STRING_KEYS, (key) => `array.${key}` as const),
  'array.string.untyped',
);
const ARRAY_NUMBER_KEYS = mapToTuple(
  NUMBER_KEYS,
  (key) => `array.${key}` as const,
);

/**
 * Available transformation types for the step numbers.
 */
const AS_TYPES = [
  ...STRING_KEYS,
  ...NUMBER_KEYS,
  ...ARRAY_STRING_KEYS,
  ...ARRAY_NUMBER_KEYS,
] as const;

function isMatchingArray<parsed extends string | number>(
  value: unknown,
  validValues: ReadonlyArray<parsed>,
): value is ReadonlyArray<parsed> {
  if (!Array.isArray(value) || value.length !== validValues.length) {
    return false;
  }

  const remaining = new Map<parsed, number>();

  for (const item of validValues) {
    remaining.set(item, (remaining.get(item) ?? 0) + 1);
  }

  for (const item of value) {
    const count = remaining.get(item as parsed);

    if (!count) {
      return false;
    }

    if (count === 1) {
      remaining.delete(item as parsed);
    } else {
      remaining.set(item as parsed, count - 1);
    }
  }

  return remaining.size === 0;
}

function includesValue(
  values: ReadonlyArray<string | number>,
  value: unknown,
): value is string | number {
  return values.some((item) => item === value);
}

function createScalarParseError(
  expression: string,
  validValues: ReadonlyArray<string | number>,
  value: unknown,
) {
  return new Error(
    `Value "${String(value)}" is not valid for ${expression}. Expected one of: ${validValues
      .map((item) => `"${String(item)}"`)
      .join(', ')}`,
  );
}

function createArrayParseError(
  validValues: ReadonlyArray<string | number>,
  value: unknown,
) {
  return new Error(
    `Value "${String(value)}" is not a valid array. Expected an array containing exactly: ${validValues
      .map((item) => `"${String(item)}"`)
      .join(', ')}`,
  );
}

function createAsScalarValue<
  expression extends string,
  parsed extends string | number,
>(
  expression: expression,
  validValues: ReadonlyArray<parsed>,
): AsScalarValue<expression, parsed> {
  return {
    value: expression,
    allows: (value: unknown): value is parsed =>
      includesValue(validValues, value),
    parse: (value: unknown): parsed => {
      if (includesValue(validValues, value)) {
        return value as parsed;
      }

      throw createScalarParseError(expression, validValues, value);
    },
  };
}

function createAsArrayValue<
  values extends ReadonlyArray<string | number>,
  parsed extends string | number,
>(
  values: values,
  validValues: ReadonlyArray<parsed>,
): AsArrayValue<values, parsed> {
  const allowsIn = (value: unknown): value is parsed =>
    includesValue(validValues, value);
  const parseIn = (value: unknown): parsed => {
    if (includesValue(validValues, value)) {
      return value as parsed;
    }

    throw createScalarParseError(validValues.join(' | '), validValues, value);
  };

  return {
    value: values,
    allows: Object.assign(
      (value: unknown) => isMatchingArray(value, validValues),
      {
        in: allowsIn,
      },
    ),
    parse: Object.assign(
      (value: unknown): values => {
        if (isMatchingArray(value, validValues)) {
          return [...values] as unknown as values;
        }

        throw createArrayParseError(validValues, value);
      },
      {
        in: parseIn,
      },
    ),
  };
}

export function createIsValidStepFn<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
>(stepNumbers: Array<number>): IsValidStepFn<def, value> {
  function isValidStep(value: string): value is StepNumbers<value>;
  function isValidStep(
    value: number,
  ): value is ExtractStepFromKey<StepNumbers<value>>;
  function isValidStep(value: string | number) {
    InvalidStepError.invariant(
      typeof value === 'string' || typeof value === 'number',
      {
        reason: `The value must be a string or a number, was ${typeof value}`,
        targetStep: value,
        validSteps: stepNumbers,
      },
    );

    if (typeof value === 'string') {
      if (!value.includes('step')) {
        return false;
      }

      return stepNumbers.includes(Number.parseInt(value.replace('step', '')));
    }

    if (typeof value === 'number') {
      return stepNumbers.includes(value);
    }

    return false;
  }

  return isValidStep;
}

export namespace MultiStepFormStepSchema {
  export type ListenerOptions<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>,
  > = {
    original: def['steps'];
    value: value;
    steps: MultiStepFormStepStepsConfig<def, value>;
    defaultNameTransformationCasing: def['nameTransformCasing'];
  };
  export type Listener<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>,
  > = (data: ListenerOptions<def, value>) => void;
}

export class MultiStepFormStepSchema<
  const def extends StepSchema.Config,
  value extends instantiateSteps<def> = instantiateSteps<def>,
>
  extends Subscribable<MultiStepFormStepSchema.Listener<def, value>>
  implements MultiStepFormStepSchemaFunctions<value>
{
  /**
   * The original config before any validation or transformations have been applied.
   */
  readonly original: def['steps'];
  /**
   * The resolved step values.
   */
  value: value;
  readonly steps: MultiStepFormStepStepsConfig<def, value>;
  readonly defaultNameTransformationCasing: def['nameTransformCasing'];
  readonly #stepNumbers: Array<number>;
  readonly #baseDefaultValues = new Map<
    StepNumbers<value>,
    Record<string, unknown>
  >();
  readonly #overrideState = new Map<
    StepNumbers<value>,
    StepOverrideResolutionState
  >();
  readonly #storage: MultiStepFormStorage<
    value,
    StepSchema.inferStorageKey<def>
  >;
  readonly #internal: MultiStepFormStepSchemaInternal<def, value>;

  constructor(config: def) {
    super();

    const { steps, nameTransformCasing, storage } = config;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing,
    ) as def['nameTransformCasing'];

    this.original = steps;

    this.value = instantiateSteps({
      steps,
      nameTransformCasing: this.defaultNameTransformationCasing,
    } as never);
    this.#internal = new MultiStepFormStepSchemaInternal({
      originalValue: this.original,
      defaultNameTransformationCasing: this.defaultNameTransformationCasing,
      getValue: () => this.value,
      setValue: (next) => this.handlePostUpdate(next),
    });

    this.value = this.#internal.enrichValues(this.value);
    this.#storage = new MultiStepFormStorage({
      data: this.value,
      key: (storage?.key ??
        DEFAULT_STORAGE_KEY) as StepSchema.inferStorageKey<def>,
      store: storage?.store,
      throwWhenUndefined: storage?.throwWhenUndefined,
    });
    this.#stepNumbers = Object.keys(this.value).map((key) =>
      Number.parseInt(key.replace('step', '')),
    );
    for (const stepKey of Object.keys(this.value) as StepNumbers<value>[]) {
      this.#baseDefaultValues.set(
        stepKey,
        getDefaultValues(this.value, stepKey) as Record<string, unknown>,
      );
    }

    this.steps = {
      value: this.#stepNumbers as unknown as ReadonlyArray<StepNumbers<value>>,
      as: (asType): any => {
        InvalidTransformationError.invariant(
          typeof asType === 'string',
          {
            reason: `The target transformation type must be a string, was ${typeof asType}`,
            transformation: asType,
            validValues: [...AS_TYPES],
          },
        );

        if (asType === 'string') {
          const validValues = this.#stepNumbers.map((value) => `${value}`);

          return createAsScalarValue(
            validValues.map((value) => `'${value}'`).join(' | '),
            validValues,
          );
        }

        if (asType === 'string.keys') {
          const validValues = this.#stepNumbers.map((value) => `step${value}`);

          return createAsScalarValue(
            validValues.map((value) => `'${value}'`).join(' | '),
            validValues,
          );
        }

        if (asType === 'number') {
          return createAsScalarValue(this.#stepNumbers.join(' | '), [
            ...this.#stepNumbers,
          ]);
        }

        if (asType.includes('array.string')) {
          if (asType.includes('keys')) {
            const validValues = this.#stepNumbers.map((value) => `step${value}`);

            return createAsArrayValue(validValues, validValues);
          }

          const validValues = this.#stepNumbers.map((value) => `${value}`);

          return createAsArrayValue(validValues, validValues);
        }

        if (asType.includes('array.number')) {
          return createAsArrayValue(this.#stepNumbers, this.#stepNumbers);
        }

        throw new Error(
          `Transformation type "${asType}" is not supported. Available transformations include: ${AS_TYPES.map(
            (value) => `"${value}"`,
          ).join(', ')}`,
        );
      },
      isValidStep: createIsValidStepFn(this.#stepNumbers),
    };

    this.sync();
    this.initializeOverrideState();
  }

  private initializeOverrideState() {
    for (const stepKey of Object.keys(this.value) as StepNumbers<value>[]) {
      this.#overrideState.set(stepKey, {
        status:
          this.hasOverrides(stepKey) && this.isStepUsingBaseDefaults(stepKey)
            ? 'idle'
            : 'resolved',
      });
    }
  }

  private getOverrideState<targetStep extends StepNumbers<value>>(
    step: targetStep,
  ) {
    return (
      this.#overrideState.get(step) ?? {
        status: 'resolved' as const,
      }
    );
  }

  private setOverrideState<targetStep extends StepNumbers<value>>(
    step: targetStep,
    state: StepOverrideResolutionState,
  ) {
    this.#overrideState.set(step, state);
    this.notify();
  }

  private isStepUsingBaseDefaults<targetStep extends StepNumbers<value>>(
    step: targetStep,
  ) {
    const currentDefaults = getDefaultValues(this.value, step);
    const baseDefaults = this.#baseDefaultValues.get(step);

    return JSON.stringify(currentDefaults) === JSON.stringify(baseDefaults);
  }

  private getStepOverride<targetStep extends StepNumbers<value>>(
    step: targetStep,
  ) {
    const current = this.original[step as keyof def['steps']];

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    return 'overrides' in current && typeof current.overrides === 'function'
      ? current.overrides
      : undefined;
  }

  private getResolvedStepData<targetStep extends StepNumbers<value>>(
    step: targetStep,
  ) {
    const currentStep = this.value[step] as value[targetStep] & {
      update?: unknown;
      reset?: unknown;
      createHelperFn?: unknown;
    };
    const { update, reset, createHelperFn, ...resolvedStep } = currentStep;

    return resolvedStep as unknown as def['steps'][Extract<
      targetStep,
      keyof def['steps']
    >] extends infer TStep
      ? TStep extends AnyConfig
        ? StepResolvedData<TStep>
        : never
      : never;
  }

  private applyStepOverrides<targetStep extends StepNumbers<value>>(
    step: targetStep,
    overrides: Partial<Record<string, unknown>>,
  ) {
    const currentStep = this.value[step] as value[targetStep] & {
      fields: Record<string, Record<string, unknown>>;
    };
    const fields = currentStep.fields;
    const nextFields = { ...fields };

    for (const [fieldName, fieldValue] of Object.entries(overrides)) {
      InvalidFieldError.invariant(
        fieldName in nextFields,
        {
          reason: `"${fieldName}" is not a valid field for ${step}`,
          targetStep: step,
          field: fieldName,
          validFields: Object.keys(nextFields),
        },
      );

      nextFields[fieldName] = {
        ...nextFields[fieldName],
        defaultValue: fieldValue,
      };
    }

    return {
      ...this.value,
      [step]: {
        ...currentStep,
        fields: nextFields,
      },
    } as value;
  }

  /**
   * @internal
   */
  __getStorage() {
    return this.#storage;
  }

  getSnapshot() {
    return this;
  }

  /**
   * Syncs the values from storage to {@linkcode value}.
   */
  sync() {
    // TODO add "syncOptions" so caller can chose where to sync from ('storage' | 'instance')
    const storageValues = this.__getStorage().get();

    if (storageValues) {
      const enrichedValues = this.#internal.enrichValues(storageValues);

      this.value = { ...enrichedValues };
    }
  }

  hasOverrides<targetStep extends StepNumbers<value>>(step: targetStep) {
    return typeof this.getStepOverride(step) === 'function';
  }

  /**
   * Checks whether the given step is complete, based on that step's `isComplete` config
   * and its current field values.
   *
   * If the step has no `isComplete` configured, it is always considered complete.
   */
  isStepComplete<targetStep extends StepNumbers<value>>(step: targetStep) {
    const stepValue = this.value[step] as { isComplete?: () => boolean };

    return stepValue.isComplete ? stepValue.isComplete() : true;
  }

  getStepStatus<targetStep extends StepNumbers<value>>(step: targetStep) {
    return this.getOverrideState(step).status;
  }

  getStepError<targetStep extends StepNumbers<value>>(step: targetStep) {
    return this.getOverrideState(step).error;
  }

  async resolveStep<targetStep extends StepNumbers<value>>(
    step: targetStep,
  ) {
    if (!this.hasOverrides(step)) {
      return this.value[step];
    }

    const currentState = this.getOverrideState(step);

    if (currentState.status === 'resolved') {
      return this.value[step];
    }

    if (currentState.status === 'loading' && currentState.promise) {
      await currentState.promise;

      return this.value[step];
    }

    const override = this.getStepOverride(step);

    InvalidInternalStateError.invariant(
      typeof override === 'function',
      {
        reason: `"${step}" does not have a valid override resolver`,
        operation: 'resolveStep',
        value: override,
      },
    );

    // Invoke the user resolver inside the chain so synchronous throws and rejected
    // promises both pass through the same persisted error-state handler.
    const promise = Promise.resolve()
      .then(() => override(this.getResolvedStepData(step)))
      .then((overrides) => {
        this.#overrideState.set(step, {
          status: 'resolved',
        });

        if (Object.keys(overrides).length === 0) {
          this.notify();

          return;
        }

        this.handlePostUpdate(
          this.applyStepOverrides(
            step,
            overrides as Partial<Record<string, unknown>>,
          ),
        );
      })
      .catch((error) => {
        this.setOverrideState(step, {
          status: 'error',
          error,
        });

        throw error;
      });

    this.setOverrideState(step, {
      status: 'loading',
      promise,
    });

    await promise;

    return this.value[step];
  }

  resolveOverrides(
    steps = Object.keys(this.value) as StepNumbers<value>[],
  ) {
    for (const step of steps) {
      void this.resolveStep(step).catch(() => {
        // Resolution errors remain available through the public step error state.
      });
    }
  }

  suspendStep<targetStep extends StepNumbers<value>>(step: targetStep) {
    if (!this.hasOverrides(step)) {
      return this.value[step];
    }

    const state = this.getOverrideState(step);

    if (state.status === 'resolved') {
      return this.value[step];
    }

    if (state.status === 'error') {
      throw state.error;
    }

    throw this.resolveStep(step);
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

  /**
   * Gets the data for a specific step.
   * @param options The options for getting the step data.
   * @returns The step data for the target step.
   */
  get<stepNumber extends StepNumbers<value>>(
    options: GetStepOptions<value, StepNumbers<value>, stepNumber>,
  ) {
    return getStep(this.value)(options);
  }

  protected handlePostUpdate(next: value) {
    this.value = { ...next };

    this.__getStorage().add(this.value);
    this.sync();
    this.notify();
  }

  /**
   * Updates the step with the given options.
   * @param options The options for updating the step.
   * @returns The return value of the updater function.
   */
  update<
    targetStep extends StepNumbers<value>,
    field extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends UpdateFn.additionalUpdaterData = never,
  >(
    options: UpdateFn.options<
      value,
      targetStep,
      field,
      strict,
      partial,
      additionalCtx,
      additionalUpdaterData
    >,
  ) {
    this.#internal.update(options);
  }

  reset<
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>,
  >(options: ResetFn.Options<value, targetStep, fields, currentStep>) {
    this.#internal.reset(options);
  }

  /**
   * Create a helper function with validated input.
   */
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps.main<
      value,
      StepNumbers<value>
    >,
    validator,
    additionalCtx extends Record<string, unknown>,
    response,
  >(
    options: HelperFnOptions.WithValidator<
      value,
      chosenSteps,
      validator,
      additionalCtx
    >,
    fn: HelperFnInput.WithValidator<
      value,
      chosenSteps,
      validator,
      additionalCtx,
      response
    >,
  ): HelperFnOutput.WithValidator<validator, response>;
  /**
   * Create a helper function without input.
   */
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps.main<
      value,
      StepNumbers<value>
    >,
    additionalCtx extends Record<string, unknown>,
    response,
  >(
    options: HelperFnOptions.WithoutValidator<
      value,
      chosenSteps,
      additionalCtx
    >,
    fn: HelperFnInput.WithoutValidator<
      value,
      chosenSteps,
      additionalCtx,
      response
    >,
  ): HelperFnOutput.WithoutInput<response>;
  // Implementation
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps.main<
      value,
      StepNumbers<value>
    >,
    response,
    additionalCtx extends Record<string, unknown>,
    validator = never,
  >(
    options:
      | HelperFnOptions.WithValidator<
          value,
          chosenSteps,
          validator,
          additionalCtx
        >
      | HelperFnOptions.WithoutValidator<value, chosenSteps, additionalCtx>,
    fn:
      | HelperFnInput.WithValidator<
          value,
          chosenSteps,
          validator,
          additionalCtx,
          response
        >
      | HelperFnInput.WithoutValidator<
          value,
          chosenSteps,
          additionalCtx,
          response
        >,
  ) {
    const { stepData, ...rest } = options;

    return this.#internal.createStepHelperFn(stepData)(rest, fn);
  }

  /**
   * Validates that a given object is the proper shape for step data.
   * @param value
   */
  static hasData(value: unknown): value is StepConfig {
    return isValidSteps(value);
  }

  /**
   * Gets the value of a given field for a given step.
   * @param step The step to get the value from.
   * @param field The field to get the value from.
   * @returns The value of the {@linkcode field}.
   */
  getValue<
    step extends StepNumbers<value>,
    field extends getDeepFields<value, step>,
  >(step: step, field: field) {
    const stepData = this.value[step];
    const baseErrorMessage = `Unable to get the value for "${String(
      step,
    )}.fields.${String(field)}"`;
    const errorSuffix = "This shouldn't be the case, so please open an issue";
    const createErrorMessage = (reason: string) =>
      `${baseErrorMessage} because ${reason}. ${errorSuffix}`;

    InvalidInternalStateError.invariant(
      typeof stepData === 'object' && stepData !== null,
      {
        reason: createErrorMessage('the step data is not an object'),
        operation: 'getValue',
        value: stepData,
      },
    );
    InvalidInternalStateError.invariant(
      'fields' in stepData,
      {
        reason: createErrorMessage(
          'the step data does not have a "fields" property',
        ),
        operation: 'getValue',
        value: stepData,
      },
    );
    InvalidInternalStateError.invariant(
      typeof stepData.fields === 'object',
      {
        reason: createErrorMessage('"fields" is not an object'),
        operation: 'getValue',
        value: stepData.fields,
      },
    );

    const defaultValue = resolvedDeepPath<
      value,
      step,
      getFieldForStep<value, step>,
      field
    >(field, stepData.fields as getFieldForStep<value, step>);

    return defaultValue;
  }
}
