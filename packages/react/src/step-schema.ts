import {
  MultiStepFormStepSchema as MultiStepFormStepSchemaBase,
  type CasingType,
  type Constrain,
  type DefaultCasing,
  type HelperFnChosenSteps,
  type InferStepOptions,
  type MultiStepFormSchemaStepConfig,
  type ResolvedStep,
  type Step,
  type StepNumbers,
  type CreateHelperFunctionOptionsBase,
  type HelperFnInputBase,
  type AnyResolvedStep,
} from '@multi-step-form/core';
import type { ReactNode } from 'react';

export type CreateComponentCallback<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TProps
> = (
  input: HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps>,
  props: TProps
) => ReactNode;
export type CreatedMultiStepFormComponent<TProps> = TProps extends undefined
  ? () => ReactNode
  : (props: TProps) => ReactNode;

export class MultiStepFormStepSchema<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends CasingType = DefaultCasing
> extends MultiStepFormStepSchemaBase<step, resolvedStep, stepNumbers, casing> {
  constructor(
    config: MultiStepFormSchemaStepConfig<step, Constrain<casing, CasingType>>
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
    const ctx = this.createStepHelperCtx(stepData);

    return ((props?: props) => fn({ ctx }, props as any)) as any;
  }
}

export function createMultiStepFormSchema<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends CasingType = DefaultCasing
>(config: MultiStepFormSchemaStepConfig<step, Constrain<casing, CasingType>>) {
  return new MultiStepFormStepSchema<step, resolvedStep, stepNumbers, casing>(
    config
  );
}
