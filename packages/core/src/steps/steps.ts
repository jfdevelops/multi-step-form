import {
  CasingType,
  Constrain,
  DEFAULT_CASING,
  DefaultCasing,
  isCasingValid,
  CASING_TYPES,
  type Expand,
} from '@/utils';
import { createInvariant, type Invariant } from '@/utils/invariant';
import type { AnyValidator, DefaultValidator } from '@/utils/validator';
import { fields } from './fields';

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
    steps: TMap;
  };
  export type instantiateSteps<T = unknown> = [T] extends [object]
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
}

export const instantiateSteps = steps.instantiate;
