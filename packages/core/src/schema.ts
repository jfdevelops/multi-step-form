import {
  MultiStepFormStepSchema,
  type MultiStepFormSchemaStepConfig,
  type ResolvedStep,
  type Step,
  type StepNumbers,
} from '@/steps';
import {
  setCasingType,
  type CasingType,
  type Constrain,
  type DefaultCasing,
} from '@/utils';
import {
  DEFAULT_STORAGE_KEY,
  MultiStepFormStorage,
  type DefaultStorageKey,
} from './storage.js';
import { Subscribable } from './subscribable.js';

export interface MultiStepFormSchemaOptions<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TStorageKey extends string
> extends MultiStepFormSchemaStepConfig<TStep, TCasing, TStorageKey> {}
export type MultiStepFormSchemaListener<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TStorageKey extends string
> = (data: MultiStepFormSchemaOptions<TStep, TCasing, TStorageKey>) => void;

export class MultiStepFormSchema<
  step extends Step<casing>,
  casing extends CasingType = DefaultCasing,
  resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<step, casing>,
  stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>,
  storageKey extends string = DefaultStorageKey
> extends Subscribable<MultiStepFormSchemaListener<step, casing, storageKey>> {
  readonly defaultNameTransformationCasing: casing;
  readonly stepSchema: MultiStepFormStepSchema<
    step,
    casing,
    resolvedStep,
    stepNumbers,
    storageKey
  >;
  storage: MultiStepFormStorage<resolvedStep, storageKey>;
  private mountCount = 0;

  constructor(
    options: MultiStepFormSchemaOptions<
      step,
      // Allows full autocomplete
      Constrain<casing, CasingType>,
      storageKey
    >
  ) {
    super();

    const { steps, nameTransformCasing, storage } = options;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing
    ) as casing;
    // @ts-ignore Type instantiation is excessively deep and possibly infinite
    this.stepSchema = new MultiStepFormStepSchema({
      steps,
      nameTransformCasing: this.defaultNameTransformationCasing,
    });
    this.storage = new MultiStepFormStorage<resolvedStep, storageKey>({
      key: (storage?.key ?? DEFAULT_STORAGE_KEY) as storageKey,
      data: this.stepSchema.value as never,
      store: storage?.store,
    });

    this.stepSchema.subscribe(() => {
      this.notify();
    });
  }

  getSnapshot() {
    return this;
  }

  mount() {
    this.mountCount++;

    if (this.mountCount === 1) {
      this.onMount();
    }

    return () => {
      this.unmount();
    };
  }

  unmount() {
    this.mountCount = Math.max(0, this.mountCount - 1);

    if (this.mountCount === 0) {
      this.onUnmount();
    }
  }

  isMounted() {
    return this.mountCount > 0;
  }

  protected onMount() {}
  protected onUnmount() {}

  protected notify() {
    for (const listener of this.listeners) {
      listener({
        nameTransformCasing: this.defaultNameTransformationCasing,
        storage: {
          key: this.storage.key,
          store: this.storage.store,
        },
        steps: this.stepSchema.original,
      });
    }
  }
}

export function createMultiStepFormSchema<
  step extends Step<casing>,
  casing extends CasingType = DefaultCasing,
  resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<step, casing>,
  stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>,
  storageKey extends string = DefaultStorageKey
>(
  options: MultiStepFormSchemaOptions<
    step,
    // Allows full autocomplete
    Constrain<casing, CasingType>,
    storageKey
  >
) {
  return new MultiStepFormSchema<
    step,
    casing,
    resolvedStep,
    stepNumbers,
    storageKey
  >(options);
}
