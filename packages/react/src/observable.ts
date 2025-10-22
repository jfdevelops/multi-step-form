import type {
  Step,
  InferStepOptions,
  StepNumbers,
} from '@multi-step-form/shared-utils';
import { type casing } from '@multi-step-form/casing';
import { MultiStepFormObserver as MultiStepFormBaseObserver } from '@multi-step-form/core';
import type { MultiStepFormSchema } from './schema';
import type { ResolvedStep } from './step-schema';

export type ObserverOptions<
  TStep extends Step<TCasing>,
  TResolvedStep extends ResolvedStep<TStep, InferStepOptions<TStep>, TCasing>,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TCasing extends casing.CasingType,
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
  casing extends casing.CasingType,
  storageKey extends string
> extends MultiStepFormBaseObserver<
  step,
  resolvedStep,
  stepNumbers,
  casing,
  storageKey
> {
  protected override schema: MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >;

  constructor(
    options: ObserverOptions<
      step,
      resolvedStep,
      stepNumbers,
      casing,
      storageKey
    >
  ) {
    super(options);

    this.schema = options.schema;
    this.subscribeToSchema();
  }

  getSnapshot(): this {
    return this;
  }

   getResult(): MultiStepFormSchema<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  > {
    return this.schema;
  }
}
