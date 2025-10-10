import {
  MultiStepFormSchema as MultiStepFormSchemaBase,
  type CasingType,
  type Constrain,
  type MultiStepFormSchemaOptions,
} from '@multi-step-form/core';
import type {
  CreateComponentCallback,
  CreatedMultiStepFormComponent,
  HelperFunctions,
} from './step-schema';
import type { CreateHelperFunctionOptionsBase, HelperFnChosenSteps, InferStepOptions, ResolvedStep, Step, StepNumbers } from '@multi-step-form/shared-utils';

export class MultiStepFormSchema<
    step extends Step<casing>,
    resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
    stepNumbers extends StepNumbers<resolvedStep>,
    casing extends CasingType,
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
  constructor(
    config: MultiStepFormSchemaOptions<
      step,
      Constrain<casing, CasingType>,
      storageKey
    >
  ) {
    super(config);
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
