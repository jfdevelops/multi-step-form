import {
  MultiStepFormStepSchemaInternal,
  type StepSchema,
} from '@/internals/step-schema';
import { DEFAULT_STORAGE_KEY, MultiStepFormStorage } from '@/storage';
import {
  setCasingType,
  type Constrain,
  type Join,
  type UnionToTuple,
} from '@/utils';
import { addToTuple, mapToTuple } from '@/utils/helpers';
import { createInvariant, invariant, type Invariant } from '@/utils/invariant';
import { Subscribable } from '../subscribable';
import {
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
  instantiateSteps,
  isValidSteps,
  type StepConfig,
  type StepNumbers,
} from './steps';
import { getStep, type ExtractStepFromKey, type GetStepOptions } from './utils';

export interface MultiStepFormStepSchemaFunctions<
  value extends instantiateSteps
> {
  update: UpdateFn.general<value>;
  reset: ResetFn.general<value>;
  createHelperFn: GeneralHelperFn<value>;
}
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
export type AsArrayAllows<
  values extends ReadonlyArray<unknown>,
  parsed extends string | number
> = ((value: unknown) => value is values) & {
  /**
   * Checks whether the provided value is one of the valid members of the transformed array.
   */
  in(value: unknown): value is parsed;
};
export type AsArrayParse<
  values extends ReadonlyArray<unknown>,
  parsed extends string | number
> = ((value: unknown) => values) & {
  /**
   * Parses a single member of the transformed array and throws if it is not valid.
   */
  in(value: unknown): parsed;
};
export interface AsArrayMethods<
  values extends ReadonlyArray<unknown>,
  parsed extends string | number
> {
  /**
   * Checks whether the provided value is an exact array match for the transformed values.
   * Order does not matter, but the array contents must match exactly.
   */
  allows: AsArrayAllows<values, parsed>;
  /**
   * Parses an exact array match for the transformed values and throws if it is not valid.
   * Order does not matter, but the array contents must match exactly.
   */
  parse: AsArrayParse<values, parsed>;
}
export type AsScalarValue<
  expression extends string,
  parsed extends string | number
> = String &
  AsMethods<parsed> & {
    readonly expression: expression;
  };
export type AsArrayValue<
  values extends ReadonlyArray<unknown>,
  parsed extends string | number
> = values & AsArrayMethods<values, parsed>;
export type AsTypeMap<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
  stepNumbers extends StepNumbers<value> = StepNumbers<value>
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
    UnionToTuple<ExtractStepFromKey<stepNumbers>>,
    ExtractStepFromKey<stepNumbers>
  >;
  'array.string': AsArrayValue<
    UnionToTuple<`${ExtractStepFromKey<stepNumbers>}`>,
    `${ExtractStepFromKey<stepNumbers>}`
  >;
  'array.string.keys': AsArrayValue<UnionToTuple<`${stepNumbers}`>, stepNumbers>;
  'array.string.untyped': AsArrayValue<string[], string>;
};
export type AsFunctionReturn<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
  asType extends AsType
> = AsTypeMap<def, value>[asType];
export type AsFunction<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>
> = <asType extends AsType>(
  asType: asType
) => AsFunctionReturn<def, value, asType>;

export type IsValidStepFn<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>
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
  value extends instantiateSteps<def>
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
  'array.string.untyped'
);
const ARRAY_NUMBER_KEYS = mapToTuple(
  NUMBER_KEYS,
  (key) => `array.${key}` as const
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

function attachExpression<value extends object>(
  result: value,
  options: {
    expression: string;
  }
) {
  const { expression } = options;

  Object.defineProperties(result, {
    expression: {
      value: expression,
      enumerable: false,
      configurable: false,
      writable: false,
    },
  });

  return result as value & { expression: string };
}

function isMatchingArray<parsed extends string | number>(
  value: unknown,
  validValues: ReadonlyArray<parsed>
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

function createAsScalarValue<
  expression extends string,
  parsed extends string | number
>(expression: expression, validValues: ReadonlyArray<parsed>) {
  const result = new String(expression);
  const allows = (value: unknown): value is parsed =>
    validValues.includes(value as parsed);
  const parse = (value: unknown): parsed => {
    if (allows(value)) {
      return value;
    }

    throw new Error(
      `Value "${String(value)}" is not valid for ${expression}. Expected one of: ${validValues
        .map((item) => `"${String(item)}"`)
        .join(', ')}`
    );
  };

  Object.defineProperties(result, {
    allows: {
      value: allows,
      enumerable: false,
      configurable: false,
      writable: false,
    },
    parse: {
      value: parse,
      enumerable: false,
      configurable: false,
      writable: false,
    },
  });

  return attachExpression(result, {
    expression,
  }) as AsScalarValue<expression, parsed>;
}

function createAsArrayValue<
  values extends ReadonlyArray<string | number>,
  parsed extends string | number
>(values: values, validValues: ReadonlyArray<parsed>) {
  const result = [...values];
  const expression = values.join(' | ');

  const allowsIn = (value: unknown): value is parsed =>
    validValues.includes(value as parsed);
  const parseIn = (value: unknown): parsed => {
    if (allowsIn(value)) {
      return value;
    }

    throw new Error(
      `Value "${String(value)}" is not valid for ${expression}. Expected one of: ${validValues
        .map((item) => `"${String(item)}"`)
        .join(', ')}`
    );
  };
  const allows = (value: unknown): value is values =>
    isMatchingArray(value, validValues);
  const parse = (value: unknown): values => {
    if (allows(value)) {
      return value;
    }

    throw new Error(
      `Value "${String(value)}" is not a valid array for ${expression}. Expected an array containing exactly: ${validValues
        .map((item) => `"${String(item)}"`)
        .join(', ')}`
    );
  };

  Object.defineProperties(result, {
    allows: {
      value: Object.assign(allows, { in: allowsIn }),
      enumerable: false,
      configurable: false,
      writable: false,
    },
    parse: {
      value: Object.assign(parse, { in: parseIn }),
      enumerable: false,
      configurable: false,
      writable: false,
    },
  });

  return attachExpression(result, {
    expression,
  }) as unknown as AsArrayValue<values, parsed>;
}

export function createIsValidStepFn<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>
>(stepNumbers: Array<number>): IsValidStepFn<def, value> {
  function isValidStep(value: string): value is StepNumbers<value>;
  function isValidStep(
    value: number
  ): value is ExtractStepFromKey<StepNumbers<value>>;
  function isValidStep(value: string | number) {
    const invariant: Invariant = createInvariant('[isValidStep]');

    invariant(
      typeof value === 'string' || typeof value === 'number',
      `The value must be a string or a number, was ${typeof value}`
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
    value extends instantiateSteps<def>
  > = {
    original: def['steps'];
    value: value;
    steps: MultiStepFormStepStepsConfig<def, value>;
    defaultNameTransformationCasing: def['nameTransformCasing'];
  };
  export type Listener<
    def extends StepSchema.Config,
    value extends instantiateSteps<def>
  > = (data: ListenerOptions<def, value>) => void;
}

export class MultiStepFormStepSchema<
    const def extends StepSchema.Config,
    value extends instantiateSteps<def> = instantiateSteps<def>
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
  readonly #storage: MultiStepFormStorage<
    value,
    StepSchema.inferStorageKey<def>
  >;
  readonly #internal: MultiStepFormStepSchemaInternal<def, value>;

  constructor(config: def) {
    super();

    const { steps, nameTransformCasing, storage } = config;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing
    ) as def['nameTransformCasing'];

    this.original = steps;

    this.value = instantiateSteps({ steps });
    this.#internal = new MultiStepFormStepSchemaInternal({
      originalValue: this.original,
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
      Number.parseInt(key.replace('step', ''))
    );

    this.steps = {
      value: this.#stepNumbers as unknown as ReadonlyArray<StepNumbers<value>>,
      as: (asType): any => {
        invariant(
          typeof asType === 'string',
          `The type of the target transformation type must be a string, was ${typeof asType}`
        );

        if (asType === 'string') {
          const validValues = this.#stepNumbers.map((value) => `${value}`);

          return createAsScalarValue(
            validValues.map((value) => `'${value}'`).join(' | '),
            validValues
          );
        }

        if (asType === 'string.keys') {
          const validValues = this.#stepNumbers.map((value) => `step${value}`);

          return createAsScalarValue(
            validValues.map((value) => `'${value}'`).join(' | '),
            validValues
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
            (value) => `"${value}"`
          ).join(', ')}`
        );
      },
      isValidStep: createIsValidStepFn(this.#stepNumbers),
    };

    this.sync();
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
    options: GetStepOptions<value, StepNumbers<value>, stepNumber>
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
    additionalUpdaterData extends UpdateFn.additionalUpdaterData = never
  >(
    options: UpdateFn.options<
      value,
      targetStep,
      field,
      strict,
      partial,
      additionalCtx,
      additionalUpdaterData
    >
  ) {
    this.#internal.update(options);
  }

  reset<
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>
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
    response
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
    >
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
    response
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
    >
  ): HelperFnOutput.WithoutInput<response>;
  // Implementation
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps.main<
      value,
      StepNumbers<value>
    >,
    response,
    additionalCtx extends Record<string, unknown>,
    validator = never
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
        >
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
    field extends getDeepFields<value, step>
  >(step: step, field: field) {
    const stepData = this.value[step];
    const invariant: Invariant = createInvariant('[getValue]');
    const baseErrorMessage = `Unable to get the value for "${String(
      step
    )}.fields.${String(field)}"`;
    const errorSuffix = "This shouldn't be the case, so please open an issue";
    const createErrorMessage = (reason: string) =>
      `${baseErrorMessage} because ${reason}. ${errorSuffix}`;

    invariant(
      typeof stepData === 'object' && stepData !== null,
      createErrorMessage('the step data is not an object')
    );
    invariant(
      'fields' in stepData,
      createErrorMessage('the step data does not have a "fields" property')
    );
    invariant(
      typeof stepData.fields === 'object',
      createErrorMessage('"fields" is not an object')
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
