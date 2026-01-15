import { MultiStepFormStepSchema } from '@/steps';
import { setCasingType } from '@/utils';
import type { StepSchema } from './internals/index.js';
import type { steps } from './steps/steps.js';
import { DEFAULT_STORAGE_KEY, MultiStepFormStorage } from './storage.js';
import { Subscribable } from './subscribable.js';

export class MultiStepFormSchema<
  const def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>
> extends Subscribable<MultiStepFormStepSchema.Listener<def, value>> {
  readonly defaultNameTransformationCasing: def['nameTransformCasing'];
  readonly stepSchema: MultiStepFormStepSchema<def, value>;
  storage: MultiStepFormStorage<value, StepSchema.inferStorageKey<def>>;
  private mountCount = 0;

  constructor(options: def) {
    super();

    const { steps, nameTransformCasing, storage } = options;

    this.defaultNameTransformationCasing = setCasingType(
      nameTransformCasing
    ) as def['nameTransformCasing'];
    // @ts-ignore Type instantiation is excessively deep and possibly infinite
    this.stepSchema = new MultiStepFormStepSchema({
      steps,
      nameTransformCasing,
      storage,
    });
    this.storage = new MultiStepFormStorage({
      key: (storage?.key ??
        DEFAULT_STORAGE_KEY) as StepSchema.inferStorageKey<def>,
      data: this.stepSchema.value,
      store: storage?.store,
      throwWhenUndefined: storage?.throwWhenUndefined,
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
  value extends steps.instantiateSteps<def>
>(options: def) {
  return new MultiStepFormSchema<def, value>(options);
}
