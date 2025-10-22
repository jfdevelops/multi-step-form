import type {
  Step,
  ResolvedStep,
  InferStepOptions,
  StepNumbers,
} from '@multi-step-form/shared-utils';
import type { CasingType } from './internals';
import type { MultiStepFormSchema } from './schema';
import { Subscribable } from './subscribable';

export type ObserverListener<
  TStep extends Step<TCasing>,
  TResolvedStep extends ResolvedStep<TStep, InferStepOptions<TStep>, TCasing>,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TCasing extends CasingType,
  TStorageKey extends string
> = (
  schema: MultiStepFormSchema<
    TStep,
    TResolvedStep,
    TStepNumbers,
    TCasing,
    TStorageKey
  >
) => void;

export type ObserverOptions<
  TStep extends Step<TCasing>,
  TResolvedStep extends ResolvedStep<TStep, InferStepOptions<TStep>, TCasing>,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TCasing extends CasingType,
  TStorageKey extends string
> = {
  schema: MultiStepFormSchema<
    TStep,
    TResolvedStep,
    TStepNumbers,
    TCasing,
    TStorageKey
  >;
};

export class MultiStepFormObserver<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends CasingType,
  storageKey extends string
> extends Subscribable<
  ObserverListener<step, resolvedStep, stepNumbers, casing, storageKey>
> {
  protected schema: MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >;
  private unsubscribeFromSchema?: () => void;

  constructor(
    options: ObserverOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      storageKey
    >
  ) {
    super();

    this.schema = options.schema;
    this.subscribeToSchema();
  }

  protected subscribeToSchema() {
    this.unsubscribeFromSchema = this.schema.subscribe(() => {
      this.notify();
    });
  }

  getSnapshot() {
    return this;
  }

  getResult() {
    return this.schema;
  }

  setOptions(
    options: Partial<
      ObserverOptions<step, resolvedStep, stepNumbers, casing, storageKey>
    >
  ) {
    if (options.schema && options.schema !== this.schema) {
      this.unsubscribeFromSchema?.();
      this.schema = options.schema;
      this.subscribeToSchema();
      this.notify();
    }
  }

  protected notify() {
    for (const listener of this.listeners) {
      listener(this.schema);
    }
  }

  destroy() {
    this.unsubscribeFromSchema?.();
    this.listeners.clear();
  }

  protected onSubscribe() {}

  protected onUnsubscribe() {}
}
