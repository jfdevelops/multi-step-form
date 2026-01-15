import type {
  AnyResolvedStep,
  HelperFnChosenSteps,
  InferStepOptions,
  ResolvedStepBuilder,
  Step
} from '@/steps';
import { instantiateFields } from '@/steps/fields';
import {
  type CasingType,
  type Constrain,
  DEFAULT_CASING,
  type DefaultCasing,
  invariant
} from '@/utils';

export const VALIDATED_STEP_REGEX = /^step\d+$/i;
export function isValidStepKey<T extends AnyResolvedStep>(
  steps: T,
  stepKey: string
): stepKey is Constrain<keyof T, string> {
  return Object.keys(steps).includes(stepKey);
}

export function createStep<
  step extends Step<casing>,
  casing extends CasingType = DefaultCasing
>(stepsConfig: InferStepOptions<step>) {
  const resolvedSteps = {} as ResolvedStepBuilder<step, casing>;

  invariant(!!stepsConfig, 'The steps config must be defined', TypeError);
  invariant(
    typeof stepsConfig === 'object',
    `The steps config must be an object, was (${typeof stepsConfig})`,
    TypeError
  );

  for (const [stepKey, stepValue] of Object.entries(stepsConfig)) {
    invariant(
      typeof stepKey === 'string',
      `Each key for the step config must be a string. Key "${stepKey}" was ${typeof stepKey} `,
      TypeError
    );
    invariant(
      VALIDATED_STEP_REGEX.test(stepKey),
      `The key "${stepKey}" isn't formatted properly. Each key in the step config must be the following format: "step{number}"`
    );

    const validStepKey = stepKey as keyof typeof resolvedSteps;
    const {
      fields,
      title,
      nameTransformCasing: defaultCasing = DEFAULT_CASING,
      description,
      validateFields,
    } = stepValue;

    const currentStep = validStepKey.toString().replace('step', '');

    invariant(
      fields,
      `Missing fields for step ${currentStep} (${String(validStepKey)})`,
      TypeError
    );
    invariant(
      typeof fields === 'object',
      'Fields must be an object',
      TypeError
    );
    invariant(
      Object.keys(fields).length > 0,
      `The fields config for step ${currentStep} (${String(
        validStepKey
      )}) is empty. Please add a field`
    );
    invariant(
      typeof fields === 'object',
      `The "fields" property must be an object. Was ${typeof fields}`
    );

    const resolvedFields = instantiateFields({
      defaultCasing,
      fields,
      validateFields,
    });

    resolvedSteps[validStepKey] = {
      ...(resolvedSteps[validStepKey] as Record<string, unknown>),
      title,
      nameTransformCasing: defaultCasing,
      // Only add the description if it's defined
      ...(typeof description === 'string' ? { description } : {}),
      fields: resolvedFields,
    } as never;
  }

  return resolvedSteps;
}

export function isTupleNotation<T extends string>(
  value: unknown
): value is HelperFnChosenSteps.tupleNotation<T> {
  if (!Array.isArray(value)) {
    return false;
  }

  if (value.length === 0) {
    return false;
  }

  if (!value.every((v) => typeof v === 'string')) {
    return false;
  }

  return true;
}
