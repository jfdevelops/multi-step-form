import { comparePartialArray, printErrors } from '@/utils/helpers';
import { createInvariant, invariant, type Invariant } from '@/utils/invariant';
import type { HelperFn, HelperFnChosenSteps } from './fn-utils/helper-fn';
import type { steps } from './steps';
import type { Updater } from './types';

export type GetStepOptions<
  value extends steps.instantiateSteps,
  stepNumbers extends steps.StepNumbers<value>,
  targetStep extends stepNumbers
> = { step: targetStep };

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
  value extends steps.instantiateSteps,
  stepNumbers extends steps.StepNumbers<value>
>(resolvedStepValues: value) {
  /**
   * Gets the step data associated with the target step number.
   *
   * @example
   * const result = getStep(resolvedStepValues)({ step: 1 });
   * // result: { step: 1, data: ... }
   *
   * @returns An object containing the `step` number and the associated step data.
   */
  return function <targetStep extends stepNumbers>(
    options: GetStepOptions<value, stepNumbers, targetStep>
  ) {
    const { step } = options;

    const data = resolvedStepValues[step] as steps.getCurrent<
      value,
      targetStep
    >;

    return { step, data };
  };
}

function createCtxHelper<
  value extends steps.instantiateSteps,
  stepNumbers extends steps.StepNumbers<value>,
  chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
>(values: value, data: string[]) {
  const invariant: Invariant = createInvariant('[createCtxHelper]');
  const getTargetStep = getStep(values);

  return data.reduce((acc, curr) => {
    const { data } = getTargetStep({
      step: curr as stepNumbers,
    });

    invariant(data, `No data was found for ${curr}`, TypeError);

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
  }, {} as HelperFn.buildCtx<value, chosenSteps>);
}

export function createCtx<
  value extends steps.instantiateSteps,
  stepNumbers extends steps.StepNumbers<value>,
  chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
>(values: value, stepData: chosenSteps) {
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
    // TODO determine if this is needed
    // let ctx = {} as HelperFn.buildCtx<value, stepNumbers, chosenSteps>;

    // for (const key of validStepKeys) {
    //   ctx = {
    //     ...ctx,
    //     [key]: getStep(values)({
    //       step: extractNumber(key) as never,
    //     }),
    //   };
    // }

    return createCtxHelper(values, validStepKeys);
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

    return createCtxHelper(values, stepData);
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

    return createCtxHelper(values, keys);
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

export function omit<T extends object, K extends (keyof T)[]>(
  obj: T,
  keys: K
): Omit<T, K[number]> {
  const keySet = new Set<keyof T>(keys);

  const result = {} as Omit<T, K[number]>;

  for (const key in obj) {
    if (!keySet.has(key)) {
      result[key as unknown as Exclude<keyof T, K[number]>] = obj[key] as never;
    }
  }

  return result;
}
