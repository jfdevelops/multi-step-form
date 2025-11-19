import { InvalidKeyError } from '@/errors/invalid-key';
import { VALIDATED_STEP_REGEX } from '@/steps';
import type {
  AnyResolvedStep,
  HelperFnChosenSteps,
  StepNumbers
} from '@/steps/types';
import { invariant } from './invariant';

export type ValidateChosenStepsHook<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>
> = (
  steps: Array<
    HelperFnChosenSteps.resolve<TResolvedStep, TStepNumbers, TChosenSteps>
  >
) => void;
export type ValidateChosenStepsHooks<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>
> = {
  whenAll: ValidateChosenStepsHook<TResolvedStep, TStepNumbers, TChosenSteps>;
  whenTuple: ValidateChosenStepsHook<TResolvedStep, TStepNumbers, TChosenSteps>;
  whenObject: ValidateChosenStepsHook<
    TResolvedStep,
    TStepNumbers,
    TChosenSteps
  >;
};

export function validateChosenSteps<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>
>(
  values: TResolvedStep,
  chosenSteps: TChosenSteps,
  hooks: ValidateChosenStepsHooks<TResolvedStep, TStepNumbers, TChosenSteps>
) {
  const { whenAll, whenObject, whenTuple } = hooks;

  if (typeof chosenSteps === 'string') {
    invariant(
      chosenSteps === 'all',
      'When using a string value for selecting the steps, the value must be "all"'
    );

    whenAll(Object.keys(values) as never);

    return;
  }

  const validKeys = Object.keys(values);

  if (Array.isArray(chosenSteps)) {
    if (chosenSteps.length === 0) {
      throw new InvalidKeyError(
        [],
        validKeys,
        ({ messages }) => `You must chose at least one step. ${messages.valid}`
      );
    }

    const nonStringEntries = chosenSteps.filter(
      (step) => typeof step !== 'string'
    );

    if (nonStringEntries.length > 0) {
      throw new InvalidKeyError(nonStringEntries, validKeys);
    }

    const invalidFormat = chosenSteps.filter((step) =>
      VALIDATED_STEP_REGEX.test(step)
    );

    if (invalidFormat.length > 0) {
      throw new InvalidKeyError(
        invalidFormat,
        validKeys,
        ({ formatter, keys, messages }) =>
          `Found values that aren't in the proper format (${formatter.format(
            keys.invalid
          )}). ${messages.valid}`
      );
    }

    const invalidKeys = chosenSteps.filter((step) => !validKeys.includes(step));

    if (invalidKeys.length > 0) {
      throw new InvalidKeyError(invalidKeys, validKeys);
    }

    whenTuple(chosenSteps as never);

    return;
  }

  if (typeof chosenSteps === 'object') {
    const keys = Object.keys(chosenSteps);

    if (keys.length === 0) {
      throw new InvalidKeyError(
        [],
        validKeys,
        ({ messages }) => `You must chose at least one step. ${messages.valid}`
      );
    }

    const invalidFormattedKeys = keys.filter(
      (key) => !VALIDATED_STEP_REGEX.test(key)
    );

    if (invalidFormattedKeys.length > 0) {
      throw new InvalidKeyError(
        invalidFormattedKeys,
        validKeys,
        ({ formatter, keys, messages }) =>
          `Found keys that aren't in the proper format (${formatter.format(
            keys.invalid
          )}). ${messages.valid}`
      );
    }

    const invalidKeys = keys.filter((key) => !validKeys.includes(key));

    if (invalidKeys.length > 0) {
      throw new InvalidKeyError(invalidKeys, validKeys);
    }

    const nonTrueValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries<true>(chosenSteps)) {
      if (typeof value !== 'boolean' && value !== true) {
        nonTrueValues[key] = value;
      }
    }

    const nonTrueKeys = Object.keys(nonTrueValues);
    if (nonTrueKeys.length > 0) {
      throw new InvalidKeyError(
        nonTrueKeys,
        validKeys,
        ({ formatter, keys }) =>
          `Values for keys ${
            keys.invalid
          } must be "true". Found ${formatter.format(
            Object.values(nonTrueValues).map(String)
          )}`
      );
    }

    whenObject(Object.keys(chosenSteps) as never);

    return;
  }

  throw new TypeError(`"${typeof chosenSteps}" is not a valid type.`);
}
