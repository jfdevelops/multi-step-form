import { invariant } from '@/utils/invariant';
import type { AnyResolvedStep, GetCurrentStep, StepNumbers } from './types';

export type GetStepOptions<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TStepNumber extends TStepNumbers
> = { step: TStepNumber };

/**
 * Gets the step number from an input string.
 * @param input The input to extract the step number from.
 * @returns The extracted step number.
 */
export function extractNumber(input: string) {
  invariant(input.includes('step'), "Can't extract a valid step number since");

  const extracted = input.replace('step', '');

  invariant(/^\d+$/.test(extracted), `Invalid step format: "${input}"`);

  return Number.parseInt(extracted, 10);
}

/**
 * A factory function to get the data of a specific step.
 * @param resolvedStepValues The resolved step values.
 * @returns A function to get specific step data from a target step.
 */
export function getStep<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends StepNumbers<resolvedStep>
>(resolvedStepValues: resolvedStep) {
  /**
   * Gets the step data associated with the target step number.
   *
   * @example
   * const result = getStep(resolvedStepValues)({ step: 1 });
   * // result: { step: 1, data: ... }
   *
   * @returns An object containing the `step` number and the associated step data.
   */
  return function <stepNumber extends stepNumbers>(
    options: GetStepOptions<resolvedStep, stepNumbers, stepNumber>
  ) {
    const { step } = options;
    const stepKey = `step${step}` as keyof typeof resolvedStepValues;

    const data = resolvedStepValues[stepKey] as GetCurrentStep<
      typeof resolvedStepValues,
      stepNumber
    >;

    return { step, data };
  };
}
