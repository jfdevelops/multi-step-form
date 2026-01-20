import type { MultiStepFormSchema } from '@/schema';
import { steps } from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import { createUseSelector } from './use-selector';

export type UseMultiStepFormDataOptions<targetStep extends string> = {
  targetStep: targetStep;
};
export type UseMultiStepFormData<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
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
  <targetStep extends steps.StepNumbers<value>>(
    options: UseMultiStepFormDataOptions<targetStep>
  ): steps.getCurrent<value, targetStep>;
  /**
   * Returns the specified data from the {@linkcode MultiStepFormSchema} instance via the callback's return.
   */
  <data>(selector: (schema: MultiStepFormSchema<def, value>) => data): data;
};

function noopSubscribe() {
  return () => {};
}

export function createMultiStepFormDataHook<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
>(schema: MultiStepFormSchema<def, value>): UseMultiStepFormData<def, value> {
  function useMultiStepFormData(
    optionsOrSelector?:
      | UseMultiStepFormDataOptions<steps.StepNumbers<value>>
      | ((data: MultiStepFormSchema<def, value>) => unknown)
  ) {
    return createUseSelector(
      optionsOrSelector ? () => optionsOrSelector : noopSubscribe,
      schema.subscribe
    );
  }

  return useMultiStepFormData as any;
}

function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
>(schema: MultiStepFormSchema<def, value>): MultiStepFormSchema<def, value>;
function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
>(
  schema: MultiStepFormSchema<def, value>,
  options: UseMultiStepFormDataOptions<steps.StepNumbers<value>>
): steps.getCurrent<value, steps.StepNumbers<value>>;
function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
  data,
>(
  schema: MultiStepFormSchema<def, value>,
  selector: (schema: MultiStepFormSchema<def, value>) => data
): data;
function useMultiStepFormData<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
>(
  schema: MultiStepFormSchema<def, value>,
  optionsOrSelector?:
    | UseMultiStepFormDataOptions<steps.StepNumbers<value>>
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
