import { InvalidContextError } from '@/errors/invalid-context';
import { InvalidKeyError } from '@/errors/invalid-key';
import { InvalidStepError } from '@/errors/invalid-step';
import type { Updater } from '@/utils/types';
import { HelperFn, HelperFnChosenSteps } from './fn-utils/helper-fn';
import type { getCurrentStep, instantiateSteps, StepNumbers } from './steps';

export type GetStepOptions<
  value extends instantiateSteps,
  stepNumbers extends StepNumbers<value>,
  targetStep extends stepNumbers
> = { step: targetStep };
export type ValidStepKey<N extends number = number> = `step${N}`;
export type CreateValidStep<
  key extends ValidStepKey = ValidStepKey,
  value = unknown
> = {
  [_ in key]: value;
};
export type ExtractStepFromKey<T> = T extends string
  ? T extends ValidStepKey<infer N>
    ? N
    : never
  : never;

/**
 * Strips function properties from a resolved step type.
 * When `withFunctions` is `true`, the type is returned as-is.
 */
export type StrippedResolvedStep<
  T,
  withFunctions extends boolean = false
> = withFunctions extends true
  ? T
  : { [K in keyof T as T[K] extends Function ? never : K]: T[K] };

/**
 * Gets the step number from an input string.
 * @param input The input to extract the step number from.
 * @returns The extracted step number.
 */
export function extractNumber(input: string) {
  InvalidStepError.invariant(input.includes('step'), {
    reason: `Can't extract a valid step number from "${input}"`,
    targetStep: input,
  });

  const extracted = input.replace('step', '');

  InvalidStepError.invariant(/^\d+$/.test(extracted), {
    reason: `Invalid step format: "${input}"`,
    targetStep: input,
  });

  return Number.parseInt(extracted, 10);
}

/**
 * A factory function to get the data of a specific step.
 * @param resolvedStepValues The resolved step values.
 * @returns A function to get specific step data from a target step.
 */
export function getStep<
  value extends instantiateSteps,
  stepNumbers extends StepNumbers<value>
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

    const data = resolvedStepValues[step] as getCurrentStep<value, targetStep>;

    return { step, data };
  };
}

function createCtxHelper<
  value extends instantiateSteps,
  stepNumbers extends StepNumbers<value>,
  chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
>(values: value, data: string[]) {
  const getTargetStep = getStep(values);

  return data.reduce((acc, curr) => {
    const { data } = getTargetStep({
      step: curr as stepNumbers,
    });

    InvalidContextError.invariant(data, {
      reason: `No data was found for ${curr}`,
      stepData: curr,
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
  }, {} as HelperFn.buildCtx<value, chosenSteps>);
}

export function createCtx<
  value extends instantiateSteps,
  stepNumbers extends StepNumbers<value>,
  chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
>(values: value, stepData: chosenSteps) {
  const validStepKeys = Object.keys(values);
  const match = HelperFnChosenSteps.match({
    validValues: () => validStepKeys,
    all: () => {
      return createCtxHelper(values, validStepKeys) as HelperFn.buildCtx<
        value,
        chosenSteps
      >;
    },
    tuple: ({ chosenSteps }) => {
      const hasOnlyValidSteps: boolean = chosenSteps.every((step) =>
        validStepKeys.includes(step),
      );

      InvalidKeyError.invariant(
        hasOnlyValidSteps,
        () => ({
          invalidKeys: chosenSteps.filter(
            (step) => !validStepKeys.includes(step),
          ),
          validKeys: validStepKeys,
        }),
      );

      return createCtxHelper(values, chosenSteps) as HelperFn.buildCtx<
        value,
        chosenSteps
      >;
    },
    object: ({ chosenSteps }) => {
      const keys = Object.keys(chosenSteps);
      const hasOnlyValidKeys: boolean = keys.every((key) =>
        validStepKeys.includes(key),
      );

      InvalidKeyError.invariant(
        hasOnlyValidKeys,
        () => ({
          invalidKeys: keys.filter((key) => !validStepKeys.includes(key)),
          validKeys: validStepKeys,
        }),
      );

      return createCtxHelper(values, keys) as HelperFn.buildCtx<
        value,
        chosenSteps
      >;
    },
    default: ({ errorMessage }) => {
      throw new Error(`[createCtx]: ${errorMessage}`);
    },
  });

  return match<value, chosenSteps>(stepData);
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
