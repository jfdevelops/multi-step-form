import {
  DefaultCasing,
  InferStepOptions,
  MultiStepFormSchemaStepConfig,
  MultiStepFormStepHelper,
  ResolvedStep,
  Step,
  StepNumbers,
} from '@multi-step-form/shared-utils';
import { MultiStepFormStorage } from './storage.js';
import { Subscribable } from './subscribable.js';
import {  MultiStepFormStepSchema } from './step-schema.js';
import { casing } from '@multi-step-form/casing';
import type { types } from '@multi-step-form/compile-time-utils';
import type { CasingType } from './internals.js';
export type MultiStepFormSchemaDefaults<
  TCasing extends CasingType,
  TStorageKey extends string
> = {
  /**
   * The default casing transformation to use.
   * @default 'title'
   */
  nameTransformCasing?: TCasing;
  /**
   * The default key that the form data will be stored under.
   * @default 'MultiStepForm'
   */
  storageKey?: TStorageKey;
};
export type MultiStepFormSchemaOptions<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TStorageKey extends string
> = Omit<
  MultiStepFormSchemaStepConfig<TStep, TCasing>,
  'nameTransformCasing'
> & {
  /**
   * Default configurations that can be set.
   */
  defaults?: MultiStepFormSchemaDefaults<TCasing, TStorageKey>;
};
export type MultiStepFormSchemaListener<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TStorageKey extends string
> = (data: {
  steps: InferStepOptions<TStep>;
  defaults: MultiStepFormSchemaDefaults<TCasing, TStorageKey>;
}) => void;

const DEFAULT_STORAGE_KEY = 'MultiStepForm';

export class MultiStepFormSchema<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends CasingType,
  storageKey extends string
> extends Subscribable<MultiStepFormSchemaListener<step, casing, storageKey>> {
  protected readonly stepHelper: MultiStepFormStepHelper<
    step,
    resolvedStep,
    stepNumbers,
    casing
  >;
  readonly storageKey: storageKey;
  readonly defaultNameTransformationCasing: casing;
  readonly stepSchema: MultiStepFormStepSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing
  >;
  storage: MultiStepFormStorage<storageKey, resolvedStep>;

  constructor(
    options: MultiStepFormSchemaOptions<
      step,
      // Allows full autocomplete
      types.Constrain<casing, CasingType>,
      storageKey
    >
  ) {
    super();

    const { steps, defaults } = options;

    this.defaultNameTransformationCasing = casing.setCasingType(
      defaults?.nameTransformCasing,
      casing.DEFAULT_CASING
    ) as casing;
    this.stepSchema = new MultiStepFormStepSchema({
      steps,
      nameTransformCasing: this.defaultNameTransformationCasing,
    });
    this.stepHelper = new MultiStepFormStepHelper(
      this.stepSchema.value,
      this.stepSchema.steps.value as Array<stepNumbers>
    );
    // Cast to make TS happy. We want `storageKey` to show as `never`
    // if there is none provided
    this.storageKey = defaults?.storageKey as storageKey;
    this.storage = new MultiStepFormStorage({
      key: (defaults?.storageKey ?? DEFAULT_STORAGE_KEY) as storageKey,
      data: this.stepSchema.value,
    });
  }

  getSnapshot() {
    return this;
  }

  protected notify() {
    this.listeners.forEach((listener) => {
      listener({
        defaults: {
          nameTransformCasing: this.defaultNameTransformationCasing,
          storageKey: this.storageKey,
        },
        steps: this.stepSchema.original,
      });
    });
  }
}

export function createMultiStepFormSchema<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends CasingType = DefaultCasing,
  storageKey extends string = typeof DEFAULT_STORAGE_KEY
>(
  options: MultiStepFormSchemaOptions<
    step,
    // Allows full autocomplete
    types.Constrain<casing, CasingType>,
    storageKey
  >
) {
  return new MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >(options);
}
