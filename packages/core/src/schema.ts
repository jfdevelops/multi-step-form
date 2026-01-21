import { MultiStepFormStepSchema } from '@/steps';
import { setCasingType } from '@/utils';
import type { StepSchema } from './internals/index.js';
import {
  DEFAULT_STORAGE_KEY,
  MultiStepFormStorage,
  type BaseStorageConfig,
} from './storage.js';
import { Subscribable } from './subscribable.js';
import type { instantiateSteps } from './steps/steps.js';

export class MultiStepFormSchema<
  const def extends StepSchema.Config,
  value extends instantiateSteps<def>
> extends Subscribable<MultiStepFormStepSchema.Listener<def, value>> {
  readonly defaultNameTransformationCasing: def['nameTransformCasing'];
  readonly stepSchema: MultiStepFormStepSchema<def, value>;
  storage: MultiStepFormStorage<value, StepSchema.inferStorageKey<def>>;
  protected readonly storageConfig: BaseStorageConfig<
    StepSchema.inferStorageKey<def>
  >;
  private mountCount = 0;

  constructor(options: def) {
    super();

    const { steps, nameTransformCasing, storage } = options;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing
    ) as def['nameTransformCasing'];
    this.stepSchema = new MultiStepFormStepSchema<def, value>({
      steps,
      nameTransformCasing: this.defaultNameTransformationCasing,
      storage,
    } as never);
    this.storageConfig = {
      key: (storage?.key ??
        DEFAULT_STORAGE_KEY) as StepSchema.inferStorageKey<def>,
      store: storage?.store,
      throwWhenUndefined: storage?.throwWhenUndefined,
    };
    this.storage = new MultiStepFormStorage({
      data: this.stepSchema.value,
      ...this.storageConfig,
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
        defaultNameTransformationCasing: this.defaultNameTransformationCasing,
        original: this.stepSchema.original,
        steps: this.stepSchema.steps,
        value: this.stepSchema.value,
      });
    }
  }
}

export function createMultiStepFormSchema<
  const def extends StepSchema.Config,
  value extends instantiateSteps<def>
>(options: def) {
  return new MultiStepFormSchema<def, value>(options);
}
