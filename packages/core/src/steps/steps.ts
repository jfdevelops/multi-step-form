import {
  CASING_TYPES,
  CasingType,
  Constrain,
  DEFAULT_CASING,
  DefaultCasing,
  isCasingValid,
  type Expand,
  type Show
} from '@/utils';
import { createInvariant, type Invariant } from '@/utils/invariant';
import type { AnyValidator, DefaultValidator } from '@/utils/validator';
import { fields } from './fields';
import type {
  StepSpecificHelperFn
} from './fn-utils/helper-fn/utils';
import type { ResetFn } from './fn-utils/reset-fn';
import type { UpdateFn } from './fn-utils/update-fn';

export const VALIDATED_STEP_REGEX = /^step\d+$/i;

export namespace steps {
  type ValidStepKey<N extends number = number> = `step${N}`;

  export interface Config<
    TCasing extends CasingType,
    TFields extends fields.FieldConfig<TCasing>,
    TValidator = unknown
  > extends fields.NameTransformCasingOptions<TCasing> {
    title: string;
    description?: string;
    fields: TFields;
    validateFields?: Constrain<TValidator, AnyValidator, DefaultValidator>;
  }
  export type AnyConfig = Config<
    CasingType,
    fields.FieldConfig<CasingType>,
    AnyValidator
  >;
  export type config<
    TCasing extends CasingType = DefaultCasing,
    TFields extends fields.FieldConfig<TCasing> = fields.FieldConfig<TCasing>,
    TValidator = unknown
  > = Record<ValidStepKey, Config<TCasing, TFields, TValidator>>;

  export type instantiateConfig<TMap extends config = config> = {
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
    steps: TMap;
  };
  export type _instantiateSteps<T = unknown> = [T] extends [object]
    ? T extends instantiateConfig
      ? {
          -readonly [key in keyof T['steps']]: Expand<
            {
              title: string;
              nameTransformCasing: fields.inferNameTransformCasing<
                T['steps'][key],
                DefaultCasing
              >;
              fields: fields.instantiateFields<
                T['steps'][key],
                fields.inferNameTransformCasing<T['steps'][key], DefaultCasing>
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
  export type instantiateSteps<
    t = unknown,
    value = _instantiateSteps<t>
  > = Expand<{
    [key in keyof value]: Show<
      value[key] &
        (value extends {}
          ? key extends StepNumbers<value>
            ? {
                update: UpdateFn.stepSpecific<value, key>;
                reset: ResetFn.stepSpecific<value, key>;
                createHelperFn: StepSpecificHelperFn<value, key>;
              }
            : {}
          : {})
    >;
  }>;
  export type Any = instantiateSteps<instantiateConfig>;
  export type StepNumbers<T> = keyof T extends string ? keyof T : never;
  export type getCurrent<
    value extends instantiateSteps,
    stepNumbers extends StepNumbers<value>
  > = value[stepNumbers];

  export function instantiate<
    const def extends instantiateConfig,
    inst = instantiateSteps<def>
  >(def: def) {
    const { steps } = def;
    const invariant: Invariant = createInvariant('[instantiateSteps]');

    invariant(
      steps,
      'No steps were provided to the "steps" option.',
      TypeError
    );
    invariant(
      typeof steps === 'object',
      '"steps" must be an object.',
      TypeError
    );
    invariant(
      Object.keys(steps).length > 0,
      '"steps" must contain at least one step.',
      TypeError
    );

    let resolvedSteps: Record<string, unknown> = {};

    for (const [stepKey, stepValue] of Object.entries(steps)) {
      const invariant: Invariant = createInvariant(
        `[instantiateSteps - ${stepKey}]`
      );

      invariant(
        typeof stepKey === 'string',
        `Each key for the step config must be a string. Key "${stepKey}" was ${typeof stepKey} `,
        TypeError
      );
      invariant(
        VALIDATED_STEP_REGEX.test(stepKey),
        `The key "${stepKey}" isn't formatted properly. Each key in the step config must be the following format: "step{number}"`
      );

      const {
        fields: fieldsDef,
        title,
        description,
        validateFields,
        nameTransformCasing = DEFAULT_CASING,
      } = stepValue;

      // title validation
      invariant(title, 'A title must be provided for each step.', TypeError);
      invariant(
        typeof title === 'string',
        'The title must be a string.',
        TypeError
      );

      if (description) {
        invariant(
          typeof description === 'string',
          'The description must be a string.',
          TypeError
        );
      }

      if (nameTransformCasing) {
        invariant(
          typeof nameTransformCasing === 'string',
          `The nameTransformCasing must be a string. Was ${typeof nameTransformCasing}`,
          TypeError
        );
        invariant(
          isCasingValid(nameTransformCasing),
          (formatter) =>
            `The nameTransformCasing is not a valid casing. Was ${nameTransformCasing}, must be one of ${formatter.format(
              CASING_TYPES
            )}`,
          TypeError
        );
      }

      const instantiatedFields = fields.instantiate({
        fields: fieldsDef,
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

    return fields.isValidFieldConfig(step.fields);
  }

  export function isValidSteps(value: unknown): value is config {
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
}

export const instantiateSteps = steps.instantiate;
