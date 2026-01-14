import {
  MultiStepFormStepSchemaInternal,
  type StepSchema,
} from '@/internals/step-schema';
import {
  DEFAULT_STORAGE_KEY,
  DefaultStorageKey,
  MultiStepFormStorage,
  type BaseStorageConfig,
  type StorageConfig,
} from '@/storage';
import {
  isCasingValid,
  isFieldType,
  setCasingType,
  type CasingType,
  type Constrain,
  type DefaultCasing,
  type Expand,
  type Join,
} from '@/utils';
import { createInvariant, invariant, type Invariant } from '@/utils/invariant';
import { Subscribable } from '../subscribable';
import { fields as fieldsUtils, type fields } from './fields';
import {
  AnyResolvedStep,
  AnyStepField,
  AnyStepFieldOption,
  CreateHelperFunctionOptionsWithCustomCtxOptions,
  CreateHelperFunctionOptionsWithValidator,
  CreateHelperFunctionOptionsWithoutValidator,
  CreateStepHelperFn,
  CreatedHelperFnWithInput,
  CreatedHelperFnWithoutInput,
  ExtractStepFromKey,
  FirstStep,
  GetCurrentStep,
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
  ValidStepKey,
} from './types';
import { getStep, type GetStepOptions } from './utils';
import { createStep, isValidStepKey } from '@/internals/utils';
import { instantiateSteps, type steps } from './steps';
import type { UpdateFn } from './fn-utils/update-fn';
import type { ResetFn } from './fn-utils/reset-fn';
import type {
  GeneralHelperFn,
  HelperFnInput,
  HelperFnOptions,
  HelperFnOutput,
} from './fn-utils/helper-fn/utils';
import type { HelperFnChosenSteps } from './fn-utils/helper-fn';

export interface MultiStepFormStepSchemaFunctions<
  value extends steps.instantiateSteps,
  stepNumbers extends steps.StepNumbers<value>
> {
  update: UpdateFn.general<value, stepNumbers>;
  createHelperFn: GeneralHelperFn<value, stepNumbers>;
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

export class MultiStepFormStepSchema<
    const def extends StepSchema.Config,
    value extends steps.instantiateSteps<def> = steps.instantiateSteps<def>,
    stepNumbers extends steps.StepNumbers<value> = steps.StepNumbers<value>
    // step extends Step<casing>,
    // casing extends CasingType = DefaultCasing,
    // resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<
    //   step,
    //   casing
    // >,
    // stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>,
    // storageKey extends string = DefaultStorageKey
  >
  extends Subscribable<MultiStepFormStepSchemaListener<step, casing>>
  implements MultiStepFormStepSchemaFunctions<value, stepNumbers>
{
  /**
   * The original config before any validation or transformations have been applied.
   */
  readonly original: def['steps'];
  /**
   * The resolved step values.
   */
  value: value;
  readonly steps: MultiStepFormStepStepsConfig<step, casing>;
  readonly defaultNameTransformationCasing: def['nameTransformCasing'];
  private readonly stepNumbers: Array<number>;
  private readonly storage: MultiStepFormStorage<
    value,
    StepSchema.inferStorageKey<def>
  >;
  readonly #internal: MultiStepFormStepSchemaInternal<def, value, stepNumbers>;

  constructor(config: def) {
    super();

    const { steps, nameTransformCasing, storage } = config;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing
    ) as def['nameTransformCasing'];

    this.original = steps;

    this.value = instantiateSteps({ steps });
    this.storage = new MultiStepFormStorage({
      data: this.value,
      key: (storage?.key ??
        DEFAULT_STORAGE_KEY) as StepSchema.inferStorageKey<def>,
      store: storage?.store,
      throwWhenUndefined: storage?.throwWhenUndefined ?? false,
    });
    this.#internal = new MultiStepFormStepSchemaInternal({
      originalValue: this.original,
      getValue: () => this.value,
      setValue: (next) => this.handlePostUpdate(next),
    });

    this.value = this.#internal.enrichValues(this.value);
    this.stepNumbers = Object.keys(this.value).map((key) =>
      Number.parseInt(key.replace('step', ''))
    );

    this.steps = {
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
      isValidStepKey: (value) =>
        isValidStepKey<resolvedStep>(this.value, value),
    };

    this.sync();
  }

  /**
   * @internal
   */
  __getStorage() {
    return this.storage;
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
  get<stepNumber extends stepNumbers>(
    options: GetStepOptions<value, stepNumbers, stepNumber>
  ) {
    return getStep(this.value)(options);
  }

  protected handlePostUpdate(next: value) {
    this.value = { ...next };

    this.__getStorage().add(this.value);
    this.sync();
    this.notify();
  }

  update<
    targetStep extends stepNumbers,
    field extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, stepNumbers, targetStep>
    > = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends UpdateFn.additionalUpdaterData = never
  >(
    options: UpdateFn.options<
      value,
      stepNumbers,
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
    targetStep extends stepNumbers,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<value, stepNumbers, targetStep>
  >(
    options: ResetFn.Options<
      value,
      stepNumbers,
      targetStep,
      fields,
      currentStep
    >
  ) {
    this.#internal.reset(options);
  }

  /**
   * Create a helper function with validated input.
   */
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    validator,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: HelperFnOptions.WithValidator<
      value,
      stepNumbers,
      chosenSteps,
      validator,
      additionalCtx
    >,
    fn: HelperFnInput.WithValidator<
      value,
      stepNumbers,
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
    const chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: HelperFnOptions.WithoutValidator<
      value,
      stepNumbers,
      chosenSteps,
      additionalCtx
    >,
    fn: HelperFnInput.WithoutValidator<
      value,
      stepNumbers,
      chosenSteps,
      additionalCtx,
      response
    >
  ): HelperFnOutput.WithoutInput<response>;
  // Implementation
  createHelperFn<
    const chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    response,
    additionalCtx extends Record<string, unknown>,
    validator = never
  >(
    options:
      | HelperFnOptions.WithValidator<
          value,
          stepNumbers,
          chosenSteps,
          validator,
          additionalCtx
        >
      | HelperFnOptions.WithoutValidator<
          value,
          stepNumbers,
          chosenSteps,
          additionalCtx
        >,
    fn:
      | HelperFnInput.WithValidator<
          value,
          stepNumbers,
          chosenSteps,
          validator,
          additionalCtx,
          response
        >
      | HelperFnInput.WithoutValidator<
          value,
          stepNumbers,
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

  /**
   * Gets the value of a given field for a given step.
   * @param step The step to get the value from.
   * @param field The field to get the value from.
   * @returns The value of the {@linkcode field}.
   */
  getValue<
    step extends stepNumbers,
    field extends fieldsUtils.getDeepFields<value, step>
  >(step: step, field: field) {
    const stepData = this.value[step];
    const invariant: Invariant = createInvariant('[getValue]');
    const baseErrorMessage = `Unable to get the value for "${String(
      step
    )}.fields.${String(field)}"`;
    const errorSuffix = "This shouldn't be the case, so please open an issue";
    const createErrorMessage = (reason: string) =>
      `${baseErrorMessage} because ${reason}. ${errorSuffix}`;
    const t = '';

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

    const fields = stepData.fields as AnyStepField;

    const defaultValue = fieldsUtils.resolvedDeepPath<
      value,
      step,
      fieldsUtils.get<value, step>,
      field
    >(field, fields as fieldsUtils.get<value, step>);

    return defaultValue;
  }
}

const test = new MultiStepFormStepSchema({
  steps: {
    step1: {
      title: 'Step 1',
      fields: {
        firstName: {
          defaultValue: '',
        },
      },
    },
  },
  storage: {
    key: 'test',
  },
});
const t = test.update({
  targetStep: 'step1',
  fields: ['fields.firstName.defaultValue'],
  updater: '',
});
