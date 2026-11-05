import type { instantiateSteps, StepNumbers } from '../steps';
import type { HelperFnChosenSteps } from './helper-fn';
import type { UpdateFn } from './update-fn';

export namespace ResetFn {
  export interface Options<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<
      value,
      targetStep
    > = UpdateFn.resolvedStep<value, targetStep>
  > extends UpdateFn.BaseOptions<value, targetStep, fields, currentStep> {
    /**
     * The specific fields to reset. If no fields are provided, all fields for
     * the current step will be reset.
     */
    fields?: fields;
  }

  export type general<value extends instantiateSteps> = <
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all'
  >(
    options: Options<value, targetStep, fields>
  ) => void;

  export type stepSpecific<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>
  > = <
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all'
  >(
    options?: Omit<Options<value, targetStep, fields>, 'targetStep'>
  ) => void;

  export type StepSpecificHelperFn<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  > = {
    [key in HelperFnChosenSteps.resolve<value, chosenSteps>]: stepSpecific<
      value,
      key
    >;
  };
  export type createHelperFnForAllSteps<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  > = chosenSteps extends HelperFnChosenSteps.defaultStringOption
    ? StepSpecificHelperFn<value, chosenSteps>
    : never;
  export type createHelperFnForTupleSteps<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  > = chosenSteps extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>
    ? StepSpecificHelperFn<value, chosenSteps>
    : never;
  export type createHelperFnForObjectSteps<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  > = chosenSteps extends HelperFnChosenSteps.objectNotation<StepNumbers<value>>
    ? // StepSpecificHelperFn already maps only the resolved selector keys. Remapping
      // every optional object-notation key would turn unselected helpers into never.
      StepSpecificHelperFn<value, chosenSteps>
    : never;
  type HelperFnMap<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  > = {
    all: createHelperFnForAllSteps<value, chosenSteps>;
    tuple: createHelperFnForTupleSteps<value, chosenSteps>;
    object: createHelperFnForObjectSteps<value, chosenSteps>;
  };
  export type HelperFn<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  > = general<value> &
    HelperFnMap<value, chosenSteps>[HelperFnChosenSteps.resolveType<
      value,
      chosenSteps
    >];
}
