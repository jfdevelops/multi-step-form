import type { MultiStepFormSchema } from '@/schema';
import {
  type getCurrentStep,
  type StepNumbers,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import { createUseSelector } from './use-selector';
import type { instantiateReactSteps } from '../steps';

export type UseMultiStepFormDataOptions<targetStep extends string> = {
  targetStep: targetStep;
};
export type UseMultiStepFormData<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>
> = {
  /**
   * Returns the entire {@linkcode MultiStepFormSchema instance}.
   */
  (): MultiStepFormSchema<def, value>;
  /**
   * Returns the data for the target step.
   * @param stepNumber The step number to return.
   * @throws {TypeError} If `options.stepNumber` is invalid.
   */
  <targetStep extends StepNumbers<value>>(
    options: UseMultiStepFormDataOptions<targetStep>
  ): getCurrentStep<value, targetStep>;
  /**
   * Returns the specified data from the {@linkcode MultiStepFormSchema} instance via the callback's return.
   */
  <data>(selector: (schema: MultiStepFormSchema<def, value>) => data): data;
};

export function createMultiStepFormDataHook<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>
>(schema: MultiStepFormSchema<def, value>): UseMultiStepFormData<def, value> {
  function useMultiStepFormData(
    optionsOrSelector?:
      | UseMultiStepFormDataOptions<StepNumbers<value>>
      | ((data: MultiStepFormSchema<def, value>) => unknown)
  ) {
    const shouldReturnWholeSchema = optionsOrSelector === undefined;
    const selector =
      typeof optionsOrSelector === 'function'
        ? optionsOrSelector
        : typeof optionsOrSelector === 'object' && optionsOrSelector !== null
          ? (data: MultiStepFormSchema<def, value>) =>
              data.stepSchema.value[optionsOrSelector.targetStep]
          : (data: MultiStepFormSchema<def, value>) => data.stepSchema.value;

    const selected = createUseSelector(
      () => schema as never,
      schema.subscribe
    )(selector as never);

    return shouldReturnWholeSchema ? schema : selected;
  }

  return useMultiStepFormData as any;
}

function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>
>(schema: MultiStepFormSchema<def, value>): MultiStepFormSchema<def, value>;
function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>
>(
  schema: MultiStepFormSchema<def, value>,
  options: UseMultiStepFormDataOptions<StepNumbers<value>>
): getCurrentStep<value, StepNumbers<value>>;
function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>,
  data
>(
  schema: MultiStepFormSchema<def, value>,
  selector: (schema: MultiStepFormSchema<def, value>) => data
): data;
function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends instantiateReactSteps<def>
>(
  schema: MultiStepFormSchema<def, value>,
  optionsOrSelector?:
    | UseMultiStepFormDataOptions<StepNumbers<value>>
    | ((data: MultiStepFormSchema<def, value>) => unknown)
) {
  const hook = createMultiStepFormDataHook(schema);

  if (typeof optionsOrSelector === 'object') {
    return hook(optionsOrSelector);
  }

  if (typeof optionsOrSelector === 'function') {
    return hook(optionsOrSelector);
  }

  return hook();
}

export { useMultiStepFormData };
