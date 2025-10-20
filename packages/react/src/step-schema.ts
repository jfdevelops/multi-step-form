import type { casing } from '@multi-step-form/casing';
import type { types } from '@multi-step-form/compile-time-utils';
import {
  createStep,
  MultiStepFormStepSchema as MultiStepFormStepSchemaBase,
} from '@multi-step-form/core';
import type {
  AnyResolvedStep,
  CreateHelperFunctionOptionsBase,
  DefaultCasing,
  ExtractStepFromKey,
  HelperFnChosenSteps,
  HelperFnInputBase,
  InferStepOptions,
  MultiStepFormSchemaStepConfig,
  ResolvedStep as ResolvedStepBase,
  ResolvedStepBuilder,
  Step,
  StepNumbers,
} from '@multi-step-form/shared-utils';
import type { ReactNode } from 'react';

export type CreateFunction<TArgs extends any[], TReturn = void> = (
  ...args: TArgs
) => TReturn;

export type CreateComponentCallback<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TProps
> = CreateFunction<
  [
    input: HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps>,
    props: TProps
  ],
  ReactNode
>;
export type CreatedMultiStepFormComponent<TProps> = TProps extends undefined
  ? () => ReactNode
  : (props: TProps) => ReactNode;
export type NonCurriedCreateComponentFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> = <
  chosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  props = undefined
>(
  options: CreateHelperFunctionOptionsBase<
    TResolvedStep,
    TStepNumbers,
    chosenSteps
  >,
  fn: CreateComponentCallback<TResolvedStep, TStepNumbers, chosenSteps, props>
) => CreatedMultiStepFormComponent<props>;
export type StepSpecificCreateComponentFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers = TStepNumbers
> = <props = undefined>(
  fn: CreateComponentCallback<
    TResolvedStep,
    TStepNumbers,
    [`step${TTargetStep}`],
    props
  >
) => CreatedMultiStepFormComponent<props>;
export type CreateComponentFn<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers = TStepNumbers,
  TUseStepSpecificVersion extends boolean = false
> = TUseStepSpecificVersion extends true
  ? StepSpecificCreateComponentFn<TResolvedStep, TStepNumbers, TTargetStep>
  : NonCurriedCreateComponentFn<TResolvedStep, TStepNumbers>;

export type ResolvedStep<
  TStep extends Step<TDefaultCasing>,
  TInferredSteps extends InferStepOptions<TStep> = InferStepOptions<TStep>,
  TDefaultCasing extends casing.CasingType = DefaultCasing,
  TResolvedStep extends ResolvedStepBuilder<
    TStep,
    TInferredSteps,
    TDefaultCasing
  > = ResolvedStepBuilder<TStep, TInferredSteps, TDefaultCasing>
> = ResolvedStepBase<
  TStep,
  TInferredSteps,
  TDefaultCasing,
  TResolvedStep,
  {
    [stepKey in keyof TResolvedStep]: {
      /**
       * A helper function to create a component for the current step.
       */
      createComponent: CreateComponentFn<
        TResolvedStep,
        StepNumbers<TResolvedStep>,
        ExtractStepFromKey<types.Constrain<stepKey, string>>,
        true
      >;
    };
  }
>;
export interface HelperFunctions<
  TStep extends Step<TCasing>,
  TResolvedStep extends ResolvedStep<TStep, InferStepOptions<TStep>, TCasing>,
  TSteps extends StepNumbers<TResolvedStep>,
  TCasing extends casing.CasingType
> {
  createComponent: CreateComponentFn<TResolvedStep, TSteps>;
}

export class MultiStepFormStepSchema<
    step extends Step<casing>,
    resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
    stepNumbers extends StepNumbers<resolvedStep>,
    casing extends casing.CasingType = DefaultCasing
  >
  extends MultiStepFormStepSchemaBase<step, resolvedStep, stepNumbers, casing>
  implements HelperFunctions<step, resolvedStep, stepNumbers, casing>
{
  value: resolvedStep;

  constructor(
    config: MultiStepFormSchemaStepConfig<
      step,
      types.Constrain<casing, casing.CasingType>
    >
  ) {
    super(config);

    this.value = this.enrichValues(
      createStep<step, resolvedStep, casing>(this.original),
      (step) => ({
        createComponent: this.createComponentForStep([
          `step${step as stepNumbers}`,
        ]),
      })
    );
  }

  private createComponentImpl<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: chosenStep) {
    const ctx = this.stepHelper.createCtx(stepData);

    return function <props>(
      fn: CreateComponentCallback<resolvedStep, stepNumbers, chosenStep, props>
    ) {
      return ((props?: props) =>
        fn({ ctx }, props as any)) as CreatedMultiStepFormComponent<props>;
    };
  }

  private createComponentForStep<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: chosenStep) {
    return this.createComponentImpl(stepData);
  }

  /**
   * A helper function to create a component for a specific step.
   * @param options The options for creating the step specific component.
   * @param fn A callback that is used for accessing the target step's data and defining
   * any props that the component should have. This function must return a valid `JSX` element.
   * @returns The created component for the step.
   */
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
  ) {
    return this.createComponentImpl(options.stepData)<props>(fn);
  }
}
