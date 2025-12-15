import type {
  AnyResolvedStep,
  AnyStepField,
  Step,
  InferStepOptions,
  ResolvedStep,
  HelperFnChosenSteps,
} from '@/steps';
import {
  type Constrain,
  type CasingType,
  changeCasing,
  DEFAULT_FIELD_TYPE,
  invariant,
  type DefaultCasing,
  DEFAULT_CASING,
} from '@/utils';
import {
  type AnyValidator,
  type DefaultValidator,
  runStandardValidation,
  type StandardSchemaValidator,
} from '@/utils/validator';

export const VALIDATED_STEP_REGEX = /^step\d+$/i;
export function isValidStepKey<T extends AnyResolvedStep>(
  steps: T,
  stepKey: string
): stepKey is Constrain<keyof T, string> {
  return Object.keys(steps).includes(stepKey);
}

export function createFieldLabel(
  label: string | false | undefined,
  fieldName: string,
  casingType: CasingType
) {
  return label ?? changeCasing(fieldName, casingType);
}

export function createStepFields(options: {
  fields: AnyStepField;
  validateFields:
    | Constrain<unknown, AnyValidator, DefaultValidator>
    | undefined;
  defaultCasing: CasingType;
}) {
  const resolvedFields: Record<string, unknown> = {};
  const { fields, defaultCasing, validateFields } = options;

  for (const [name, values] of Object.entries(fields)) {
    invariant(
      typeof name === 'string',
      `Each key for the "fields" option must be a string. Key ${name} was a ${typeof name}`
    );
    invariant(
      typeof values === 'object',
      `The value for key ${name} must be an object. Was ${typeof values}`
    );

    const {
      defaultValue,
      label,
      nameTransformCasing,
      type = DEFAULT_FIELD_TYPE,
    } = values;

    if (validateFields) {
      resolvedFields[name] = defaultValue;
    } else {
      const casing = nameTransformCasing ?? defaultCasing;

      resolvedFields[name] = {
        ...(resolvedFields[name] as Record<string, unknown>),
        nameTransformCasing: casing,
        type,
        defaultValue,
        label: createFieldLabel(label, name, casing),

        // TODO add more fields here
      };
    }
  }

  if (validateFields) {
    const validatedFields = runStandardValidation(
      validateFields as StandardSchemaValidator,
      resolvedFields
    );

    invariant(
      typeof validatedFields === 'object',
      `The result of the validated fields must be an object, was (${typeof validatedFields}). This is probably an internal error, so open up an issue about it`
    );
    invariant(
      !!validatedFields,
      'The result of the validated fields must be defined. This is probably an internal error, so open up an issue about it'
    );

    for (const [name, defaultValue] of Object.entries(validatedFields)) {
      const currentField = fields[name];

      invariant(
        currentField,
        `No field found in the fields config for "${name}"`
      );

      const {
        label,
        type = DEFAULT_FIELD_TYPE,
        nameTransformCasing,
      } = currentField;
      const casing = nameTransformCasing ?? defaultCasing;

      resolvedFields[name] = {
        ...(resolvedFields[name] as Record<string, unknown>),
        nameTransformCasing: casing,
        type,
        defaultValue,
        label: createFieldLabel(label, name, casing),
      };
    }
  }

  return resolvedFields;
}
export function createStep<
  step extends Step<casing>,
  casing extends CasingType = DefaultCasing
>(stepsConfig: InferStepOptions<step>) {
  const resolvedSteps = {} as ResolvedStep<step, casing>;

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

    const resolvedFields = createStepFields({
      defaultCasing,
      fields,
      validateFields,
    });

    resolvedSteps[validStepKey] = {
      ...resolvedSteps[validStepKey],
      title,
      nameTransformCasing: defaultCasing,
      // Only add the description if it's defined
      ...(typeof description === 'string' ? { description } : {}),
      fields: resolvedFields,
    };
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
