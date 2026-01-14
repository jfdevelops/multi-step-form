import type { steps } from '../steps';
import type { HelperFnChosenSteps } from './helper-fn';
import type { UpdateFn } from './update-fn';

export namespace ResetFn {
  export interface Options<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<
      value,
      stepNumbers,
      targetStep
    > = UpdateFn.resolvedStep<value, stepNumbers, targetStep>
  > extends UpdateFn.BaseOptions<
      value,
      stepNumbers,
      targetStep,
      fields,
      currentStep
    > {
    /**
     * The specific fields to reset. If no fields are provided, all fields for
     * the current step will be reset.
     */
    fields?: fields;
  }

  export type general<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>
  > = <
    targetStep extends stepNumbers,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, stepNumbers, targetStep>
    > = 'all'
  >(
    options: Options<value, stepNumbers, targetStep, fields>
  ) => void;

  export type stepSpecific<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers
  > = <
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, stepNumbers, targetStep>
    > = 'all'
  >(
    options?: Omit<
      Options<value, stepNumbers, targetStep, fields>,
      'targetStep'
    >
  ) => void;

  export type StepSpecificHelperFn<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers
  > = {
    [key in targetStep]: stepSpecific<value, stepNumbers, key>;
  };
  export type createHelperFnForAllSteps<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = chosenSteps extends HelperFnChosenSteps.defaultStringOption
    ? StepSpecificHelperFn<value, stepNumbers, stepNumbers>
    : never;
  export type createHelperFnForTupleSteps<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = chosenSteps extends HelperFnChosenSteps.tupleNotation<stepNumbers>
    ? StepSpecificHelperFn<value, stepNumbers, chosenSteps[number]>
    : never;
  export type createHelperFnForObjectSteps<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = chosenSteps extends HelperFnChosenSteps.objectNotation<stepNumbers>
    ? {
        [key in keyof chosenSteps]: key extends stepNumbers
          ? StepSpecificHelperFn<value, stepNumbers, key>[key]
          : never;
      }
    : never;
  type HelperFnMap<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = {
    all: createHelperFnForAllSteps<value, stepNumbers, chosenSteps>;
    tuple: createHelperFnForTupleSteps<value, stepNumbers, chosenSteps>;
    object: createHelperFnForObjectSteps<value, stepNumbers, chosenSteps>;
  };
  export type HelperFn<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = general<value, stepNumbers> &
    HelperFnMap<
      value,
      stepNumbers,
      chosenSteps
    >[HelperFnChosenSteps.resolveType<value, stepNumbers, chosenSteps>];
}
