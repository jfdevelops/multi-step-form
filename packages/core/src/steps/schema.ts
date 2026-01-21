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
  fields,
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
export type AsTypeMap<
  def extends StepSchema.Config,
  value extends instantiateSteps<def>,
  stepNumbers extends StepNumbers<value> = StepNumbers<value>
> = {
  // Exclude is needed due to all the Constrains
  string: Exclude<
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
  >;
  'string.keys': Exclude<
    Join<
      Constrain<UnionToTuple<`${ExtractStepFromKey<stepNumbers>}`>, string[]>,
      ' | '
    >,
    ''
  >;
  number: Exclude<
    Join<Constrain<UnionToTuple<`${stepNumbers}`>, string[]>, ' | '>,
    ''
  >;
  'array.number': UnionToTuple<ExtractStepFromKey<stepNumbers>>;
  'array.string': UnionToTuple<`${ExtractStepFromKey<stepNumbers>}`>;
  'array.string.keys': UnionToTuple<`${stepNumbers}`>;
  'array.string.untyped': string[];
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
          return this.#stepNumbers.map((value) => `'${value}'`).join(' | ');
        }

        if (asType === 'string.keys') {
          return this.#stepNumbers.map((value) => `'step${value}'`).join(' | ');
        }

        if (asType === 'number') {
          return this.#stepNumbers.join(' | ');
        }

        if (asType.includes('array.string')) {
          if (asType.includes('keys')) {
            return this.#stepNumbers.map((value) => `step${value}`);
          }

          return this.#stepNumbers.map((value) => `${value}`);
        }

        if (asType.includes('array.number')) {
          return this.#stepNumbers;
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
