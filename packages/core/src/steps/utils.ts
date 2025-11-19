import { comparePartialArray, printErrors } from '@/utils/helpers';
import { invariant } from '@/utils/invariant';
import type {
  AnyResolvedStep,
  GetCurrentStep,
  HelperFnChosenSteps,
  HelperFnCtx,
  StepNumbers,
  Updater,
} from './types';

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

function createCtxHelper<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>
>(values: TResolvedStep, data: string[]) {
  return data.reduce((acc, curr) => {
    const stepNumber = extractNumber(curr);
    const { data } = getStep(values)({
      step: stepNumber as TStepNumbers,
    });

    for (const [key, value] of Object.entries(data)) {
      // console.log({ [key]: value });
      // Remove the functions from the data to comply with `StrippedResolvedStep`
      if (typeof value === 'function' && key !== 'update') {
        continue;
      }

      data[key as keyof typeof data] = value as never;
    }

    acc[curr as keyof typeof acc] = data as never;

    return acc;
  }, {} as HelperFnCtx<TResolvedStep, TStepNumbers, TChosenSteps>);
}

export function createCtx<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>
>(values: TResolvedStep, stepData: TChosenSteps) {
  const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'disjunction',
  });
  const validStepKeys = Object.keys(values);

  const baseErrorMessage = () => {
    return `"stepData" must be set to an array of available steps (${formatter.format(
      validStepKeys
    )})`;
  };

  if (stepData === 'all') {
    let ctx = {} as HelperFnCtx<TResolvedStep, TStepNumbers, TChosenSteps>;

    for (const key of validStepKeys) {
      ctx = {
        ...ctx,
        [key]: getStep(values)({
          step: extractNumber(key) as never,
        }),
      };
    }

    return Object.fromEntries(
      validStepKeys.map((key) => [
        key,
        getStep(values)({
          step: extractNumber(key) as never,
        }),
      ])
    ) as unknown as HelperFnCtx<TResolvedStep, TStepNumbers, TChosenSteps>;
  }

  if (Array.isArray(stepData)) {
    invariant(
      stepData.every((step) => validStepKeys.includes(step)),
      () => {
        const comparedResults = comparePartialArray(
          stepData,
          validStepKeys.map((key) => extractNumber(key)),
          formatter
        );

        if (comparedResults.status === 'error') {
          return `${baseErrorMessage()}. See errors:\n ${printErrors(
            comparedResults.errors
          )}`;
        }

        return baseErrorMessage();
      }
    );

    return createCtxHelper<TResolvedStep, TStepNumbers, TChosenSteps>(
      values,
      stepData
    );
  }

  if (typeof stepData === 'object') {
    const keys = Object.keys(stepData);

    invariant(
      keys.every((key) => validStepKeys.includes(key)),
      () => {
        const comparedResults = comparePartialArray(
          keys,
          validStepKeys,
          formatter
        );

        if (comparedResults.status === 'error') {
          return `${baseErrorMessage()}. See errors:\n ${printErrors(
            comparedResults.errors
          )}`;
        }

        return baseErrorMessage();
      }
    );

    return createCtxHelper<TResolvedStep, TStepNumbers, TChosenSteps>(
      values,
      keys
    );
  }

  throw new Error(`${baseErrorMessage()} OR to "all"`);
}

export function functionalUpdate<TInput, TOutput>(
  updater: Updater<TInput, TOutput>,
  input: TInput
) {
  if (typeof updater === 'function') {
    return (updater as (_: TInput) => TOutput)(input);
  }

  return updater;
}
