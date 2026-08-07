import { StepSchema } from '@/internals';
import { InvalidStepConfigError } from '@/errors/invalid-step-config';
import {
  CASING_TYPES,
  CasingType,
  Constrain,
  DEFAULT_CASING,
  DefaultCasing,
  isCasingValid,
  type Expand,
  type Show,
} from '@/utils';
import type { AnyValidator, DefaultValidator } from '@/utils/validator';
import {
  inferDefaultValue,
  instantiateFields,
  isValidFieldConfig,
  type FieldConfig,
  type inferNameTransformCasing,
  type NameTransformCasingOptions,
} from './fields';
import type { StepSpecificHelperFn } from './fn-utils/helper-fn/utils';
import type { ResetFn } from './fn-utils/reset-fn';
import type { UpdateFn } from './fn-utils/update-fn';

export const VALIDATED_STEP_REGEX = /^step\d+$/i;

type ValidStepKey<N extends number = number> = `step${N}`;
type StripStringIndex<T> = Expand<{
  [key in keyof T as string extends key ? never : key]: T[key];
}>;

interface BaseConfig<
  TFields extends FieldConfig<CasingType>,
  // NOTE: defaults to the wide `CasingType`, not `DefaultCasing` — see the matching note on
  // `StepSchema.Config` in internals/step-schema.ts for why (this default is what's used when
  // this type appears bare as a generic constraint).
  TCasing extends CasingType = CasingType,
  TValidator = unknown,
> extends NameTransformCasingOptions<TCasing> {
  title: string;
  description?: string;
  fields: TFields;
  validateFields?: Constrain<TValidator, AnyValidator, DefaultValidator>;
}
export type AnyConfig = BaseConfig<
  FieldConfig<CasingType>,
  CasingType,
  AnyValidator
>;
export type StepResolvedData<TConfig extends AnyConfig> = Expand<
  {
    title: string;
    nameTransformCasing: inferNameTransformCasing<TConfig, DefaultCasing>;
    fields: StripStringIndex<
      instantiateFields<TConfig, inferNameTransformCasing<TConfig, DefaultCasing>>
    >;
  } & (TConfig extends {
    description: infer description extends string;
  }
    ? { description: description }
    : {})
>;
export type StepOverridePatch<TConfig extends AnyConfig> = Partial<
  StepDefaultValues<TConfig['fields']>
>;
export type StepOverrideResult<TConfig extends AnyConfig> =
  | StepOverridePatch<TConfig>
  | Promise<StepOverridePatch<TConfig>>;
export type StepOverrides<TConfig extends AnyConfig> = (
  data: StepResolvedData<TConfig>,
) => StepOverrideResult<TConfig>;
/**
 * A predicate that determines whether a step is complete, based on that step's
 * current field values.
 */
export type StepIsCompleteFn<TConfig extends AnyConfig> = (
  data: StepDefaultValues<TConfig['fields']>,
) => boolean;
export interface Config<
  TFields extends FieldConfig<CasingType> = FieldConfig<CasingType>,
  // NOTE: see the matching note on `BaseConfig` above for why this defaults to `CasingType`.
  TCasing extends CasingType = CasingType,
  TValidator = unknown,
> extends BaseConfig<TFields, TCasing, TValidator> {}

export type StepConfig<
  // NOTE: see the matching note on `BaseConfig` above for why this defaults to `CasingType`.
  TCasing extends CasingType = CasingType,
  TFields extends FieldConfig<TCasing> = FieldConfig<TCasing>,
  TValidator = unknown,
> = Record<ValidStepKey, Config<TFields, TCasing, TValidator>>;

export type StepDefaultValues<TFields extends FieldConfig<CasingType>> = {
  [key in keyof TFields as string extends key ? never : key]: inferDefaultValue<
    TFields[key]
  >;
};

type JustStepConfig<T> = Pick<T, keyof T & keyof Config>;
type OverrideStepConfig<T> = T extends Config<
  infer TFields,
  infer TCasing,
  infer TValidator
>
  ? Config<TFields, TCasing, TValidator>
  : never;

export type instantiateStepsConfig<TMap extends StepConfig = StepConfig> = {
  /**
   * The steps that this multi step form will include.
   * @example
   * ```ts
   * {
   *   step1: {
   *     title: 'Step 1',
   *     fields: {
   *       name: {
   *         defaultValue: '',
   *       },
   *     },
   *  },
   *   step2: {
   *     title: 'Step 2',
   *     fields: {
   *       dateOfBirth: {
   *         defaultValue: new Date(),
   *         // `type` is automatically set to `date` if the defaultValue is a Date
   *       },
   *     },
   *   },
   * }
   * ```
   */
  steps: {
    [key in keyof TMap]: JustStepConfig<TMap[key]> & {
      /**
       * Determines whether this step is complete, based on that step's current field values.
       *
       * If omitted, the step is always considered complete.
       */
      isComplete?: StepIsCompleteFn<OverrideStepConfig<TMap[key]>>;
    };
  };
};
/**
 * Extended step specific properties for the step.
 */
export interface ExtendedStepSpecificProperties<
  def extends StepSchema.Config,
  value extends _instantiateSteps<def>,
  _key extends keyof value,
> {}

export interface StepExtension<
  TDef extends StepSchema.Config,
  TValue extends _instantiateSteps<TDef>,
  _TKey extends keyof TValue,
> {}

/**
 * The schema-wide default casing (`nameTransformCasing`) to fall back to for a step/field that
 * doesn't set its own. Falls back to {@linkcode DefaultCasing} when `T` doesn't carry one.
 */
export type inferSchemaDefaultCasing<T> = T extends {
  nameTransformCasing?: infer casing;
}
  ? casing extends CasingType
    ? casing
    : DefaultCasing
  : DefaultCasing;

export type _instantiateSteps<T = unknown> = [T] extends [object]
  ? T extends instantiateStepsConfig
    ? {
        -readonly [key in keyof T['steps']]: Expand<
          {
            title: string;
            nameTransformCasing: inferNameTransformCasing<
              T['steps'][key],
              inferSchemaDefaultCasing<T>
            >;
            fields: StripStringIndex<
              instantiateFields<
                T['steps'][key],
                inferNameTransformCasing<T['steps'][key], inferSchemaDefaultCasing<T>>
              >
            >;
          } & (T['steps'][key] extends {
            description: infer description extends string;
          }
            ? { description: description }
            : {})
        >;
      }
    : {}
  : {};
export type BaseStepFunctions<
  def,
  value extends _instantiateSteps<def>,
  key extends keyof value,
> = Show<
  value[key] &
    (value extends {}
      ? key extends StepNumbers<value>
        ? key extends ValidStepKey
          ? {
              // The entire step value is passed into the step specific functions
              // because of the `ctxData` property.
              update: UpdateFn.stepSpecific<value, key>;
              reset: ResetFn.stepSpecific<value, key>;
              createHelperFn: StepSpecificHelperFn<value, key>;
              /**
               * Checks whether this step is complete, based on that step's current field values.
               */
              isComplete: () => boolean;
            }
          : {}
        : {}
      : {})
>;

export type instantiateSteps<
  t = unknown,
  value extends _instantiateSteps<t> = _instantiateSteps<t>,
> = Expand<{
  [key in keyof value]: BaseStepFunctions<t, value, key>;
}>;
export type AnySteps = instantiateSteps<instantiateStepsConfig>;
export type StepNumbers<T> = keyof T extends string ? keyof T : never;
export type getCurrentStep<
  value extends instantiateSteps,
  stepNumbers extends StepNumbers<value>,
> = value[stepNumbers];

export function instantiateSteps<
  const def extends instantiateStepsConfig,
  inst = instantiateSteps<def>,
>(def: def) {
  const { steps } = def;
  const schemaDefaultCasing =
    (def as { nameTransformCasing?: CasingType }).nameTransformCasing ?? DEFAULT_CASING;

  InvalidStepConfigError.invariant(steps, {
    reason: 'No steps were provided to the "steps" option.',
    expected: 'non-empty object',
  });
  InvalidStepConfigError.invariant(typeof steps === 'object', {
    reason: '"steps" must be an object.',
    value: steps,
    expected: 'object',
  });
  InvalidStepConfigError.invariant(
    Object.keys(steps).length > 0,
    {
      reason: '"steps" must contain at least one step.',
      value: steps,
      expected: 'non-empty object',
    },
  );

  let resolvedSteps: Record<string, unknown> = {};

  for (const [stepKey, stepValue] of Object.entries(steps)) {
    InvalidStepConfigError.invariant(
      typeof stepKey === 'string',
      {
        reason: `Each key for the step config must be a string. Key "${stepKey}" was ${typeof stepKey}`,
        key: stepKey,
        value: stepKey,
        expected: 'string',
      },
    );
    InvalidStepConfigError.invariant(
      VALIDATED_STEP_REGEX.test(stepKey),
      {
        reason: `The key "${stepKey}" isn't formatted properly. Each key in the step config must use "step{number}"`,
        key: stepKey,
        value: stepKey,
        expected: 'step{number}',
      },
    );

    const {
      fields: fieldsDef,
      title,
      description,
      validateFields,
      nameTransformCasing = schemaDefaultCasing,
    } = stepValue;

    // title validation
    InvalidStepConfigError.invariant(title, {
      reason: 'A title must be provided for each step.',
      key: stepKey,
      expected: 'non-empty string',
    });
    InvalidStepConfigError.invariant(
      typeof title === 'string',
      {
        reason: 'The title must be a string.',
        key: stepKey,
        value: title,
        expected: 'string',
      },
    );

    if (description) {
      InvalidStepConfigError.invariant(
        typeof description === 'string',
        {
          reason: 'The description must be a string.',
          key: stepKey,
          value: description,
          expected: 'string',
        },
      );
    }

    if (nameTransformCasing) {
      InvalidStepConfigError.invariant(
        typeof nameTransformCasing === 'string',
        {
          reason: `The nameTransformCasing must be a string. Was ${typeof nameTransformCasing}`,
          key: stepKey,
          value: nameTransformCasing,
          expected: 'string',
        },
      );
      InvalidStepConfigError.invariant(
        isCasingValid(nameTransformCasing),
        {
          reason: `The nameTransformCasing is not valid. Was ${nameTransformCasing}`,
          key: stepKey,
          value: nameTransformCasing,
          expected: CASING_TYPES,
        },
      );
    }

    const instantiatedFields = instantiateFields({
      fields: fieldsDef as never,
      defaultCasing: nameTransformCasing,
      validateFields,
    });

    resolvedSteps[stepKey] = {
      ...(resolvedSteps[stepKey] as Record<string, unknown>),
      title,
      // Only add the description if it's defined
      ...(typeof description === 'string' ? { description } : {}),
      nameTransformCasing,
      fields: instantiatedFields,
    };
  }

  return resolvedSteps as inst;
}

function isValidStepValue(stepValue: unknown): stepValue is AnyConfig {
  if (stepValue === null || typeof stepValue !== 'object') {
    return false;
  }

  const step = stepValue as Record<string, unknown>;

  // Must have title
  if (!('title' in step) || typeof step.title !== 'string') {
    return false;
  }

  // If description is provided, it must be a string
  if ('description' in step) {
    if (typeof step.description !== 'string') {
      return false;
    }
  }

  // If nameTransformCasing is provided, it must be a valid casing
  if ('nameTransformCasing' in step) {
    const casing = step.nameTransformCasing;
    if (typeof casing !== 'string' || !isCasingValid(casing)) {
      return false;
    }
  }

  // Must have fields and it must be a valid field config
  if (!('fields' in step)) {
    return false;
  }

  return isValidFieldConfig(step.fields);
}

export function isValidSteps(value: unknown): value is StepConfig {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const steps = value as Record<string, unknown>;

  // Check if steps has at least one key
  if (Object.keys(steps).length === 0) {
    return false;
  }

  // Validate each step
  for (const [stepKey, stepValue] of Object.entries(steps)) {
    // Each key must be a string
    if (typeof stepKey !== 'string') {
      return false;
    }

    // Each key must match the step regex pattern
    if (!VALIDATED_STEP_REGEX.test(stepKey)) {
      return false;
    }

    // Each value must be a valid step config
    if (!isValidStepValue(stepValue)) {
      return false;
    }
  }

  return true;
}
