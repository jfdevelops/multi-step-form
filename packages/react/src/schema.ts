import {
  MultiStepFormSchema as MultiStepFormSchemaBase,
  type AnyMultiStepFormSchema,
  type MultiStepFormSchemaOptions,
} from '@multi-step-form/core';
import {
  CreateComponentCallback,
  CreatedMultiStepFormComponent,
  HelperFunctions,
  MultiStepFormStepSchema,
  type ResolvedStep,
} from './step-schema';
import type {
  CreateHelperFunctionOptionsBase,
  DefaultCasing,
  HelperFnChosenSteps,
  InferStepOptions,
  Step,
  StepNumbers,
} from '@multi-step-form/shared-utils';
import type { types } from '@multi-step-form/compile-time-utils';
import { casing } from '@multi-step-form/casing';

type MutableArray<T> = T extends ReadonlyArray<infer U> ? U[] : T;
export type GetMultiStepFormSteps<TSchema extends AnyMultiStepFormSchema> =
  MutableArray<TSchema['stepSchema']['steps']['value']>[number];

export class MultiStepFormSchema<
    step extends Step<casing>,
    resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
    stepNumbers extends StepNumbers<resolvedStep>,
    casing extends casing.CasingType,
    storageKey extends string
  >
  extends MultiStepFormSchemaBase<
    step,
    resolvedStep,
    stepNumbers,
    casing,
    storageKey
  >
  implements HelperFunctions<step, resolvedStep, stepNumbers, casing>
{
  stepSchema: MultiStepFormStepSchema<step, resolvedStep, stepNumbers, casing>;

  constructor(
    config: MultiStepFormSchemaOptions<
      step,
      types.Constrain<casing, casing.CasingType>,
      storageKey
    >
  ) {
    super(config);

    // @ts-ignore
    this.stepSchema = new MultiStepFormStepSchema({
      steps: config.steps,
      nameTransformCasing:
        config.defaults?.nameTransformCasing ?? casing.DEFAULT_CASING,
    });
  }

  createComponent<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    props = undefined
  >(
    options: CreateHelperFunctionOptionsBase<
      resolvedStep,
      stepNumbers,
      chosenSteps
    >,
    fn: CreateComponentCallback<resolvedStep, stepNumbers, chosenSteps, props>
  ): CreatedMultiStepFormComponent<props> {
    const { stepData } = options;
    const ctx = this.stepHelper.createCtx(stepData);

    return ((props?: props) => fn({ ctx }, props as any)) as any;
  }
}

export function createMultiStepFormSchema<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType = DefaultCasing,
  storageKey extends string = 'MultiStepForm'
>(
  options: MultiStepFormSchemaOptions<
    step,
    types.Constrain<casing, casing.CasingType>,
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
