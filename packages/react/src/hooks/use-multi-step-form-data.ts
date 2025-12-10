import type { AnyMultiStepFormSchema, MultiStepFormSchema } from '@/schema';
import {
  invariant,
  VALIDATED_STEP_REGEX,
} from '@jfdevelops/multi-step-form-core';
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

export type UseMultiStepFormDataOptions<
  TSchema extends AnyMultiStepFormSchema,
  TTarget extends keyof MultiStepFormSchema.resolvedStep<TSchema> = keyof MultiStepFormSchema.resolvedStep<TSchema>
> = {
  targetStep: TTarget;
};
export type UseMultiStepFormData<
  // step extends Step<casing>,
  // casing extends CasingType,
  // storageKey extends string,
  // resolvedStep extends ResolvedStep<step, casing>,
  // schema extends MultiStepFormSchema<
  //   step,
  //   casing,
  //   storageKey
  // > = MultiStepFormSchema<step, casing, storageKey>,
  TSchema extends AnyMultiStepFormSchema,
  TResolvedStep extends MultiStepFormSchema.resolvedStep<TSchema> = MultiStepFormSchema.resolvedStep<TSchema>
> = {
  /**
   * Returns the entire {@linkcode MultiStepFormSchema instance}.
   */
  (): TSchema;
  /**
   * Returns the data for the target step.
   * @param stepNumber The step number to return.
   * @throws {TypeError} If `options.stepNumber` is invalid.
   */
  <targetStep extends keyof TResolvedStep>(
    options: UseMultiStepFormDataOptions<TSchema, targetStep>
  ): MultiStepFormSchema.getData<TSchema, targetStep>;
  /**
   * Returns the specified data from the {@linkcode MultiStepFormSchema} instance via the callback's return.
   */
  <data>(selector: (schema: TSchema) => data): data;
};

export function throwIfInvalidStepNumber<
  // step extends Step<casing>,
  // casing extends CasingType = DefaultCasing,
  // storageKey extends string = DefaultStorageKey,
  // resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<step, casing>,
  // stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>
  schema extends AnyMultiStepFormSchema
>(schema: schema, targetStep: unknown) {
  invariant(
    typeof targetStep === 'string',
    `The target step must be a string, was ${typeof targetStep}`
  );

  const { as, isValidStepNumber } = schema.stepSchema.steps;
  const formatter = new Intl.ListFormat('en', {
    type: 'disjunction',
    style: 'long',
  });
  const formattedStepNumbersList = formatter.format(as('array.string.untyped'));

  invariant(
    VALIDATED_STEP_REGEX.test(targetStep),
    `The target step must match the following format: "step{number}". Available steps are ${formattedStepNumbersList}`
  );

  const stepNumber = Number.parseInt(targetStep.replace('step', ''));

  invariant(
    isValidStepNumber(stepNumber),
    `The step number "${stepNumber}" is not a valid step number. Valid step numbers include ${formattedStepNumbersList}`,
    TypeError
  );

  return stepNumber as MultiStepFormSchema.stepNumbers<schema>;
}

export function createMultiStepFormDataHook<
  // step extends Step<casing>,
  // casing extends CasingType = DefaultCasing,
  // storageKey extends string = DefaultStorageKey,
  // resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<step, casing>,
  // stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>
  schema extends AnyMultiStepFormSchema
>(schema: schema): UseMultiStepFormData<schema> {
  function useMultiStepFormData(
    optionsOrSelector?:
      | UseMultiStepFormDataOptions<schema>
      | ((data: schema) => unknown)
  ) {
    return useSyncExternalStoreWithSelector(
      schema.subscribe,
      () => schema.getSnapshot(),
      () => schema.getSnapshot(),
      (snapshot) => {
        if (typeof optionsOrSelector === 'object') {
          // @ts-ignore Type instantiation is excessively deep and possibly infinite
          const stepNumber = throwIfInvalidStepNumber(
            snapshot,
            optionsOrSelector.targetStep
          );

          return snapshot.stepSchema.get({ step: stepNumber as never }).data;
        }

        if (typeof optionsOrSelector === 'function') {
          return optionsOrSelector(snapshot);
        }

        return snapshot;
      }
    );
  }

  return useMultiStepFormData as any;
}

function useMultiStepFormData<schema extends AnyMultiStepFormSchema>(
  schema: schema
): schema;
function useMultiStepFormData<
  schema extends AnyMultiStepFormSchema,
  targetStep extends keyof MultiStepFormSchema.resolvedStep<schema>
>(
  schema: schema,
  options: UseMultiStepFormDataOptions<schema, targetStep>
): MultiStepFormSchema.getData<schema, targetStep>;
function useMultiStepFormData<schema extends AnyMultiStepFormSchema, data>(
  schema: schema,
  selector: (schema: schema) => data
): data;
function useMultiStepFormData<
  // step extends Step<casing>,
  // casing extends CasingType = DefaultCasing,
  // storageKey extends string = DefaultStorageKey,
  // resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<step, casing>,
  // stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>
  schema extends AnyMultiStepFormSchema
>(
  schema: schema,
  optionsOrSelector?:
    | UseMultiStepFormDataOptions<schema>
    | ((data: schema) => unknown)
) {
  const hook = createMultiStepFormDataHook(schema);

  if (typeof optionsOrSelector === 'object') {
    return hook(optionsOrSelector);
  }

  if (typeof optionsOrSelector === 'function') {
    return hook(optionsOrSelector);
  }

  return hook();
}

export { useMultiStepFormData };
