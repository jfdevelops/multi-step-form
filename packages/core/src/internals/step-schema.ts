import { createCtx } from '@/steps';
import { InvalidContextError } from '@/errors/invalid-context';
import { InvalidInternalStateError } from '@/errors/invalid-internal-state';
import { InvalidKeyError } from '@/errors/invalid-key';
import { InvalidStepError } from '@/errors/invalid-step';
import { InvalidUpdateError } from '@/errors/invalid-update';
import { InvalidHelperInputError } from '@/errors/invalid-helper-input';
import { UpdateMismatchError } from '@/errors/update-mismatch';
import type { NameTransformCasingOptions } from '@/steps/fields';
import { HelperFn, HelperFnChosenSteps } from '@/steps/fn-utils/helper-fn';
import type {
  HelperFnInput,
  HelperFnOptions,
  HelperFnOutput,
} from '@/steps/fn-utils/helper-fn/utils';
import type { ResetFn } from '@/steps/fn-utils/reset-fn';
import type { UpdateFn } from '@/steps/fn-utils/update-fn';
import {
  instantiateSteps,
  type instantiateStepsConfig,
  type StepConfig,
  type StepNumbers,
} from '@/steps/steps';
import { functionalUpdate, omit } from '@/steps/utils';
import type { BaseStorageConfig, DefaultStorageKey } from '@/storage';
import {
  MultiStepFormLogger,
  type CasingType,
  type DeepKeys,
} from '@/utils';
import {
  comparePartialArray,
  typedObjectKeys,
} from '@/utils/helpers';
import { path } from '@/utils/path';
import {
  allowsStandardValidation,
  runStandardValidation,
  validateStandardSchema,
  type StandardSchemaValidator,
} from '@/utils/validator';

function verifyUpdate<def, paths extends DeepKeys<def>>(options: {
  targetStep: string;
  fields: unknown;
  strict: boolean;
  partial: boolean;
  silenceErrors: boolean;
  obj: def;
  paths: paths[];
  actual: path.pickBy<def, paths>;
}) {
  const {
    targetStep,
    fields,
    strict,
    partial,
    actual,
    obj,
    paths,
    silenceErrors,
  } = options;

  // Define the logic for when the update is considered valid
  const { mismatches, ok } = path.equalsAtPaths(obj, paths, actual);

  let isValid = true;

  if (strict) {
    isValid = ok && mismatches.length === 0;
  }

  if (partial) {
    const mismatchesWithoutMissingKey = mismatches.filter(
      ({ reason }) => reason !== 'missing-key'
    );

    if (strict) {
      isValid = mismatchesWithoutMissingKey.length === 0;
    } else {
      const withoutExtraKey = mismatchesWithoutMissingKey.filter(
        ({ reason }) => reason !== 'extra-key'
      );

      isValid = withoutExtraKey.length === 0;
    }
  }

  if (!silenceErrors) {
    path.printMismatches({ ok, mismatches });

    if (!isValid) {
      throw new UpdateMismatchError({
        targetStep,
        fields,
        strict,
        partial,
        mismatches,
        mismatchDetails: path.formatMismatches({ ok, mismatches }),
      });
    }
  }
}

export namespace MultiStepFormStepSchemaInternal {
  export interface Options<
    def extends StepSchema.Config,
    value extends instantiateSteps<def> = instantiateSteps<def>,
    additionalEnrichedProps extends Record<string, unknown> = {}
  > {
    originalValue: def['steps'];
    /**
     * The schema-wide default casing, used as the fallback when a step/field doesn't set its
     * own `nameTransformCasing` — threaded through so resets back to the original values use the
     * same default casing the schema was constructed with.
     */
    defaultNameTransformationCasing?: def['nameTransformCasing'];
    additionalEnrichedProps?: (step: number) => additionalEnrichedProps;
    /**
     * The resolved multi step form values.
     */
    getValue: () => value;
    /**
     * A function used for setting the `value`. It is called after the
     * `value` is updated successfully.
     * @param value The updated and enriched multi step form values.
     * @returns
     */
    setValue: (value: value) => void;
  }
}

export namespace StepSchema {
  export type Config<
    TSteps extends StepConfig = StepConfig,
    // NOTE: defaults to the wide `CasingType` (not `DefaultCasing`) since this default is what's
    // used when `Config` appears bare as a generic constraint (e.g. `<const def extends
    // StepSchema.Config>`) — it needs to accept any concrete casing, not just `'title'`. Callers
    // that want the runtime default casing pass `DefaultCasing`/omit `nameTransformCasing`
    // explicitly at the value level, which is unrelated to this type-level default.
    TCasing extends CasingType = CasingType,
    TStorageKey extends string = string
  > = instantiateStepsConfig<TSteps> &
    NameTransformCasingOptions<TCasing> & {
      /**
       * The options for the storage module.
       */
      storage?: BaseStorageConfig<TStorageKey>;
    };

  export type inferStorageKey<T> = T extends Config
    ? undefined extends T['storage']
      ? DefaultStorageKey
      : T['storage'] extends { key: infer key extends string }
      ? key
      : DefaultStorageKey
    : DefaultStorageKey;
}

export class MultiStepFormStepSchemaInternal<
  const def extends StepSchema.Config,
  value extends instantiateSteps<def> = instantiateSteps<def>,
  additionalEnrichedProps extends Record<string, unknown> = {}
> {
  readonly #originalValue: def['steps'];
  readonly #defaultNameTransformationCasing?: def['nameTransformCasing'];
  readonly #additionalEnrichedProps?: (step: number) => additionalEnrichedProps;
  readonly #getValue: () => value;
  readonly #setValue: (value: value) => void;

  private get value() {
    return this.#getValue();
  }

  constructor(
    options: MultiStepFormStepSchemaInternal.Options<
      def,
      value,
      additionalEnrichedProps
    >
  ) {
    const {
      getValue,
      setValue,
      originalValue,
      defaultNameTransformationCasing,
      additionalEnrichedProps,
    } = options;

    this.#originalValue = originalValue;
    this.#defaultNameTransformationCasing = defaultNameTransformationCasing;
    this.#getValue = getValue;
    this.#setValue = setValue;
    this.#additionalEnrichedProps = additionalEnrichedProps;
  }

  private handlePostUpdate(value: value) {
    this.#setValue(this.enrichValues(value));
  }

  private buildCtxData<
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    values,
    additionalCtx extends Record<string, unknown>
  >(
    options: Required<
      HelperFn.CtxDataSelector<value, chosenSteps, additionalCtx>
    > & {
      values: values;
      logger: MultiStepFormLogger;
    }
  ) {
    const { logger, values, ctxData } = options;
    InvalidContextError.invariant(
      typeof ctxData === 'function',
      {
        reason: '"ctxData" must be a function',
        value: ctxData,
        expected: 'function',
      },
    );
    logger.info('Custom "ctx" will be used');

    const additionalCtx = ctxData({ ctx: values as never });

    InvalidContextError.invariant(
      typeof additionalCtx === 'object' &&
        Object.keys(additionalCtx).length > 0,
      {
        reason: '"ctxData" must return an object with keys',
        value: additionalCtx,
        expected: 'non-empty object',
      },
    );

    logger.info(
      `Custom "ctx" consists of the following keys: ${new Intl.ListFormat(
        'en',
        {
          style: 'long',
          type: 'conjunction',
        }
      ).format(Object.keys(additionalCtx))}`
    );

    return additionalCtx;
  }

  private createStepUpdaterFnImpl<
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
    strict extends boolean,
    partial extends boolean,
    additionalCtx extends Record<string, unknown>,
    additionalUpdaterData extends UpdateFn.additionalUpdaterData
  >(
    options: UpdateFn.options<
      value,
      targetStep,
      fields,
      strict,
      partial,
      additionalCtx,
      additionalUpdaterData
    >
  ) {
    const {
      targetStep,
      ctxData,
      fields = 'all',
      debug,
      partial = false,
      strict = true,
      silentErrors,
    } = options;
    const silenceErrors = silentErrors ?? (partial || !strict);
    const logger = new MultiStepFormLogger({
      debug,
      prefix: (value) => `${value}:update${targetStep}`,
    });

    logger.info(`${targetStep} will be updated`);
    InvalidStepError.invariant(
      targetStep in this.value,
      {
        reason: `The target step ${targetStep} isn't valid`,
        targetStep,
        validSteps: Object.keys(this.value),
      },
    );

    const { [targetStep]: currentStep, ...values } = this.value;

    InvalidUpdateError.invariant(
      'updater' in options,
      {
        reason: 'No "updater" was found',
        targetStep,
        expected: 'updater property',
      },
    );

    const updater = options.updater;

    let updatedValue = { ...this.value };
    let ctx = createCtx(updatedValue, [targetStep]);

    // Build the `ctx` first
    if (ctxData) {
      const additionalCtx = this.buildCtxData({
        values,
        ctxData,
        logger,
      });

      ctx = {
        ...ctx,
        ...additionalCtx,
      } as never;
    }

    const updated = functionalUpdate(updater, {
      ctx: ctx as never,
      update: this.createHelperFnInputUpdate([targetStep]),
      reset: this.createHelperFnInputReset([targetStep]),
    });
    logger.info(`The updated data is ${JSON.stringify(updated, null, 2)}`);

    // TODO validate `updater` - will have to be done in each case (I think)

    // default case: updating all fields for the current step
    if (fields === 'all') {
      InvalidUpdateError.invariant(
        typeof updated === 'object',
        {
          reason: '"updater" must be an object or return an object',
          targetStep,
          value: updated,
          expected: 'object',
        },
      );

      const functionKeys = new Set(['update', 'reset', 'createHelperFn']);
      const currentStepEntries = Object.entries(
        currentStep as Record<string, unknown>
      );
      const updatedStep = Object.fromEntries(
        Object.entries(updated as Record<string, unknown>).filter(
          ([key]) => !functionKeys.has(key)
        )
      );
      const functions = Object.fromEntries(
        currentStepEntries.filter(([key]) => functionKeys.has(key))
      );
      const expectedStep = Object.fromEntries(
        currentStepEntries.filter(([key]) => !functionKeys.has(key))
      );
      const paths = path.createDeep(expectedStep);

      verifyUpdate({
        targetStep,
        fields,
        strict,
        partial,
        silenceErrors,
        obj: expectedStep,
        paths,
        actual: updatedStep as never,
      });

      logger.info('The entire step will be updated');

      updatedValue = {
        ...updatedValue,
        [targetStep]: {
          ...path.updateAt({
            obj: expectedStep,
            paths,
            value: updatedStep as never,
            partial,
          }),
          ...functions,
        },
      };

      this.handlePostUpdate(updatedValue);
      logger.info(`The new value is: ${JSON.stringify(updatedValue, null, 2)}`);

      return;
    }

    const currentStepDeepKeys = path.createDeep(currentStep);

    if (Array.isArray(fields)) {
      const compareResult = comparePartialArray(currentStepDeepKeys, fields);

      InvalidKeyError.invariant(
        compareResult.status === 'success',
        {
          invalidKeys: fields,
          validKeys: currentStepDeepKeys,
        },
      );

      verifyUpdate({
        targetStep,
        fields,
        strict,
        partial,
        silenceErrors,
        obj: currentStep,
        paths: fields,
        actual: updated as never,
      });

      logger.info(
        `The following fields will be updated: ${new Intl.ListFormat('en', {
          type: 'conjunction',
          style: 'long',
        }).format(fields)}`
      );

      updatedValue = {
        ...updatedValue,
        [targetStep]: path.updateAt({
          obj: currentStep as Record<string, unknown>,
          paths: fields,
          value: updated as never,
          partial,
        }),
      };

      this.handlePostUpdate(updatedValue);
      logger.info(`The new value is: ${JSON.stringify(updatedValue, null, 2)}`);

      return;
    }

    if (typeof fields === 'object' && Object.keys(fields).length > 0) {
      const keys = path.createDeep(fields);
      const compareResult = comparePartialArray(
        currentStepDeepKeys,
        keys as never
      );

      InvalidKeyError.invariant(
        compareResult.status === 'success',
        {
          invalidKeys: keys,
          validKeys: currentStepDeepKeys,
        },
      );

      // TODO validate all values (deepest) are `true`
      verifyUpdate({
        targetStep,
        fields,
        strict,
        partial,
        silenceErrors,
        obj: currentStep,
        paths: keys as never,
        actual: updated as never,
      });

      updatedValue = {
        ...updatedValue,
        [targetStep]: path.updateAt({
          obj: currentStep as Record<string, unknown>,
          paths: keys as never,
          value: updated as never,
          partial,
        }),
      };

      logger.info(
        `The following fields will be updated: ${new Intl.ListFormat('en', {
          type: 'conjunction',
          style: 'long',
        }).format(Object.keys(fields))}`
      );
      this.handlePostUpdate(updatedValue);
      logger.info(`The new value is: ${JSON.stringify(updatedValue, null, 2)}`);

      return;
    }

    logger.error('Unsupported value for the "fields" option');
    throw new TypeError(
      `[update]: property "fields" must be set to one of the following: "all", an array of deep paths to update, or an object of paths. Was ${typeof updater}`,
      { cause: updater }
    );
  }

  createStepUpdaterFn<targetStep extends StepNumbers<value>>(
    targetStep: targetStep
  ): UpdateFn.stepSpecific<value, targetStep> {
    return (options) => {
      this.createStepUpdaterFnImpl({ targetStep, ...options });
    };
  }

  update<
    targetStep extends StepNumbers<value>,
    field extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends UpdateFn.additionalUpdaterData = never
  >(
    options: UpdateFn.options<
      value,
      targetStep,
      field,
      strict,
      partial,
      additionalCtx,
      additionalUpdaterData
    >
  ) {
    return this.createStepUpdaterFnImpl(options);
  }

  private resetFields<
    targetStep extends StepNumbers<value>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>
  >(config: {
    targetStep: targetStep;
    values: value;
    updatedValues: value;
    logger: MultiStepFormLogger;
  }) {
    return <
      fields extends HelperFnChosenSteps.tupleNotation<DeepKeys<currentStep>>
    >(
      fields: fields
    ) => {
      const { targetStep, logger, values } = config;
      const resolvedFields = fields.map((value) => `${targetStep}.${value}`);
      const picked = path.pickBy<value, DeepKeys<value>>(
        values,
        ...(resolvedFields as any)
      );

      // Apply original field values onto the live schema so unrelated fields and steps
      // keep the values the user has already entered.
      config.updatedValues = path.updateAt({
        obj: config.updatedValues,
        paths: resolvedFields as DeepKeys<value>[],
        value: picked,
      });

      const formatter = new Intl.ListFormat('en', {
        style: 'long',
        type: 'conjunction',
      });
      const message = `${formatter.format(fields)} for ${targetStep}`;

      logger.info(`Resetting ${message}`);
      this.handlePostUpdate(config.updatedValues);
      logger.info(`Reset ${message}`);
    };
  }

  private createStepResetterFnImpl<
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>
  >(options: ResetFn.Options<value, targetStep, fields, currentStep>) {
    const { fields = 'all', targetStep, debug } = options;
    const logger = new MultiStepFormLogger({
      debug,
      prefix: (value) => `${value}:reset${targetStep}`,
    });
    const originalValues = instantiateSteps({
      steps: this.#originalValue,
      nameTransformCasing: this.#defaultNameTransformationCasing,
    } as never);
    const enrichedOriginalValues = this.enrichValues(
      originalValues,
      this.#additionalEnrichedProps
    ) as value;

    if (fields === 'all') {
      logger.info(`Resetting all fields for ${targetStep}`);
      // A step-scoped reset must replace only its target; writing every original step
      // here would silently discard progress made elsewhere in the form.
      this.handlePostUpdate({
        ...this.value,
        [targetStep]: enrichedOriginalValues[targetStep],
      });
      logger.info(`Reset all fields for ${targetStep}`);

      return;
    }

    let updatedValues = { ...this.value };
    const reset = this.resetFields<targetStep, currentStep>({
      logger,
      targetStep,
      updatedValues,
      values: enrichedOriginalValues,
    });

    if (HelperFnChosenSteps.isTuple<DeepKeys<currentStep>>(fields)) {
      reset(fields as never);
    }

    if (typeof fields === 'object' && Object.keys(fields).length > 0) {
      const keys = path.createDeep(fields);

      reset(keys as never);
    }
  }

  createStepResetterFn<targetStep extends StepNumbers<value>>(
    targetStep: targetStep
  ): ResetFn.stepSpecific<value, targetStep> {
    return (options) => {
      return this.createStepResetterFnImpl({
        targetStep,
        fields: options?.fields ?? 'all',
        debug: options?.debug ?? false,
      });
    };
  }

  reset<
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>
  >(options: ResetFn.Options<value, targetStep, fields, currentStep>) {
    this.createStepResetterFnImpl(options);
  }

  createHelperFnInputUpdate<
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  >(chosenSteps: chosenSteps) {
    const match = HelperFnChosenSteps.match({
      meta: {
        value: this.value,
      },
      validValues: ({ meta }) => Object.keys(meta.value),
      all: ({ meta }) => {
        const stepSpecificUpdateFn = typedObjectKeys(meta.value).reduce(
          (acc, key) => {
            (acc as any)[key] = this.createStepUpdaterFn(key as never);

            return acc;
          },
          {} as UpdateFn.createHelperFnForAllSteps<value, chosenSteps>
        );
        const update = Object.assign(
          this.update.bind(this),
          stepSpecificUpdateFn
        ) as UpdateFn.HelperFn<value, chosenSteps>;

        return update;
      },
      object: ({ chosenSteps }) => {
        const stepSpecificUpdateFn = Object.keys(chosenSteps).reduce(
          (acc, key) => {
            (acc as any)[key] = this.createStepUpdaterFn(key as never);

            return acc;
          },
          {} as UpdateFn.createHelperFnForObjectSteps<value, chosenSteps>
        );
        const update = Object.assign(
          this.update.bind(this),
          stepSpecificUpdateFn
        ) as UpdateFn.HelperFn<value, chosenSteps>;

        return update;
      },
      tuple: () => {
        const stepSpecificUpdateFn = (
          chosenSteps as HelperFnChosenSteps.tupleNotation<StepNumbers<value>>
        ).reduce((acc, step) => {
          (acc as any)[step] = this.createStepUpdaterFn(step);

          return acc;
        }, {} as UpdateFn.createHelperFnForTupleSteps<value, chosenSteps>);
        const update = Object.assign(
          this.update.bind(this),
          stepSpecificUpdateFn
        ) as UpdateFn.HelperFn<value, chosenSteps>;

        return update;
      },
      default: ({ errorMessage }) => {
        throw new TypeError(`[update]: ${errorMessage}`);
      },
    });

    return match<value, chosenSteps>(chosenSteps);
  }

  createHelperFnInputReset<
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  >(chosenSteps: chosenSteps) {
    const match = HelperFnChosenSteps.match({
      meta: {
        value: this.value,
      },
      validValues: ({ meta }) => Object.keys(meta.value),
      all: () => {
        const stepSpecificUpdateFn = typedObjectKeys(this.value).reduce(
          (acc, key) => {
            (acc as any)[key] = this.createStepResetterFn(key as never);

            return acc;
          },
          {} as ResetFn.createHelperFnForAllSteps<value, chosenSteps>
        );
        const reset = Object.assign(
          this.reset,
          stepSpecificUpdateFn
        ) as ResetFn.HelperFn<value, chosenSteps>;

        return reset;
      },
      tuple: () => {
        const stepSpecificUpdateFn = (
          chosenSteps as HelperFnChosenSteps.tupleNotation<StepNumbers<value>>
        ).reduce((acc, step) => {
          (acc as any)[step] = this.createStepResetterFn(step as never);

          return acc;
        }, {} as ResetFn.createHelperFnForTupleSteps<value, chosenSteps>);
        const reset = Object.assign(
          this.reset,
          stepSpecificUpdateFn
        ) as ResetFn.HelperFn<value, chosenSteps>;

        return reset;
      },
      object: ({ chosenSteps }) => {
        const stepSpecificUpdateFn = Object.keys(chosenSteps).reduce(
          (acc, key) => {
            (acc as any)[key] = this.createStepResetterFn(key as never);

            return acc;
          },
          {} as ResetFn.createHelperFnForObjectSteps<value, chosenSteps>
        );
        const reset = Object.assign(
          this.reset,
          stepSpecificUpdateFn
        ) as ResetFn.HelperFn<value, chosenSteps>;

        return reset;
      },
      default: ({ errorMessage }) => {
        throw new TypeError(`[reset]: ${errorMessage}`);
      },
    });

    return match<value, chosenSteps>(chosenSteps);
  }

  private resolveStepIsComplete<targetStep extends StepNumbers<value>>(
    targetStep: targetStep,
    stepValue: unknown
  ) {
    const original = (this.#originalValue as Record<string, unknown>)[
      targetStep as string
    ] as
      | {
          isComplete?: (data: Record<string, unknown>) => boolean;
          validateFields?: StandardSchemaValidator;
        }
      | undefined;
    const currentStep = stepValue as {
      fields: Record<string, { defaultValue: unknown }>;
    };
    const data = Object.fromEntries(
      Object.entries(currentStep.fields).map(([name, field]) => [
        name,
        field.defaultValue,
      ])
    );

    if (original && typeof original.isComplete === 'function') {
      return Boolean(original.isComplete(data));
    }

    if (original?.validateFields) {
      return allowsStandardValidation(original.validateFields, data);
    }

    return true;
  }

  private createStepValidateFn<targetStep extends StepNumbers<value>>(
    targetStep: targetStep
  ) {
    return () => {
      const original = (this.#originalValue as Record<string, unknown>)[
        targetStep as string
      ] as { validateFields: StandardSchemaValidator };
      const stepValue = this.value[targetStep] as {
        fields: Record<string, { defaultValue: unknown }>;
      };
      const data = Object.fromEntries(
        Object.entries(stepValue.fields).map(([name, field]) => [
          name,
          field.defaultValue,
        ])
      );

      return validateStandardSchema(original.validateFields, data);
    };
  }

  createStepHelperFn<
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>
  >(stepData: chosenSteps) {
    return <validator, additionalCtx extends Record<string, unknown>, response>(
      optionsOrFunction:
        | Omit<
            HelperFnOptions.WithValidator<
              value,
              chosenSteps,
              validator,
              additionalCtx
            >,
            'stepData'
          >
        | Omit<
            HelperFnOptions.WithoutValidator<value, chosenSteps, additionalCtx>,
            'stepData'
          >
        | HelperFnInput.WithoutValidator<
            value,
            chosenSteps,
            additionalCtx,
            response
          >,
      fn:
        | HelperFnInput.WithValidator<
            value,
            chosenSteps,
            validator,
            additionalCtx,
            response
          >
        | HelperFnInput.WithoutValidator<
            value,
            chosenSteps,
            additionalCtx,
            response
          >
    ) => {
      const functions = {
        update: this.createHelperFnInputUpdate(stepData),
        reset: this.createHelperFnInputReset(stepData),
      };

      if (typeof optionsOrFunction === 'function') {
        return () => {
          // Create ctx fresh each time the function is called to ensure it has the latest this.value
          const ctx = createCtx(this.value, stepData) as never;
          return optionsOrFunction({
            ctx,
            ...functions,
          });
        };
      }

      if (typeof optionsOrFunction === 'object') {
        return (input?: HelperFnOutput.Input<validator>) => {
          // Create ctx fresh each time the function is called to ensure it has the latest this.value
          let ctx = createCtx(this.value, stepData);

          if ('validator' in optionsOrFunction) {
            InvalidHelperInputError.invariant(
              typeof input === 'object',
              {
                reason: 'An input is expected when a validator is provided',
                helper: 'createHelperFn',
                value: input,
                expected: 'object',
              },
            );

            runStandardValidation(
              optionsOrFunction.validator as StandardSchemaValidator,
              input.data
            );

            if (optionsOrFunction.ctxData) {
              const ctxData = optionsOrFunction.ctxData;

              InvalidContextError.invariant(
                typeof ctxData === 'function',
                {
                  reason: 'Option "ctxData" must be a function',
                  value: ctxData,
                  expected: 'function',
                },
              );

              const logger = new MultiStepFormLogger({
                debug: false,
                prefix: (value) => `${value}:ctxData`,
              });
              const match = HelperFnChosenSteps.match({
                meta: {
                  value: this.value,
                  stepData,
                  ctxData,
                  logger,
                },
                validValues: ({ meta }) => Object.keys(meta.value),
                all: ({ meta }) => {
                  // Allow all steps to be selected
                  const { value, ctxData, logger } = meta;

                  return this.buildCtxData({
                    ctxData,
                    values: value,
                    logger,
                  });
                },
                tuple: ({ meta }) => {
                  // Allow the non-selected steps to be selected
                  const { value, stepData, ctxData, logger } = meta;
                  const targetSteps = HelperFnChosenSteps.createTupleNotation(
                    ...(stepData as HelperFnChosenSteps.tupleNotation<
                      StepNumbers<value>
                    >)
                  );
                  const values = omit(value, targetSteps);

                  return this.buildCtxData({
                    ctxData,
                    values,
                    logger,
                  });
                },
                object: ({ meta }) => {
                  // Allow the non-selected steps to be selected
                  const { value, stepData, ctxData, logger } = meta;
                  const targetSteps = Object.keys(
                    stepData
                  ) as StepNumbers<value>[];
                  const values = omit(value, targetSteps);

                  return this.buildCtxData({
                    ctxData,
                    values,
                    logger,
                  });
                },
                default: ({ errorMessage }) => {
                  throw new TypeError(`[ctxData]: ${errorMessage}`);
                },
              });
              const additionalCtx = match<value, chosenSteps>(stepData);

              ctx = {
                ...ctx,
                ...additionalCtx,
              } as never;
            }

            return fn({
              ctx: ctx as never,
              ...functions,
              ...input,
            } as never);
          }

          return (
            fn as HelperFnInput.WithoutValidator<
              value,
              chosenSteps,
              additionalCtx,
              response
            >
          )({
            ctx: ctx as never,
            ...functions,
          });
        };
      }

      throw new Error(
        `The first argument must be a function or an object, (was ${typeof optionsOrFunction})`
      );
    };
  }

  enrichValues<
    values extends Record<string, unknown>,
    additionalProps extends Record<string, unknown>
  >(values: values, additionalProps?: (step: number) => additionalProps) {
    InvalidInternalStateError.invariant(
      typeof values === 'object' && values !== null,
      {
        reason: 'The values must be an object',
        operation: 'enrichValues',
        value: values,
      },
    );

    if (additionalProps) {
      InvalidInternalStateError.invariant(
        typeof additionalProps === 'function',
        {
          reason: 'The additional props must be a function',
          operation: 'enrichValues',
          value: additionalProps,
        },
      );
    }

    let enriched = { ...values };

    for (const [key, stepValue] of Object.entries(enriched)) {
      const targetStep = key as StepNumbers<value>;
      const step = Number.parseInt(targetStep.replace('step', ''));
      const originalStep = (this.#originalValue as Record<string, unknown>)[
        targetStep as string
      ];
      const hasValidateFields =
        typeof originalStep === 'object' &&
        originalStep !== null &&
        'validateFields' in originalStep &&
        originalStep.validateFields !== undefined;

      InvalidInternalStateError.invariant(
        typeof stepValue === 'object' && stepValue !== null,
        {
          reason: `The value for ${key} must be an object`,
          operation: 'enrichValues',
          value: stepValue,
        },
      );

      enriched[targetStep as keyof values] = {
        ...stepValue,
        update: this.createStepUpdaterFn(targetStep),
        reset: this.createStepResetterFn(targetStep),
        createHelperFn: this.createStepHelperFn([targetStep]),
        isComplete: this.resolveStepIsComplete(targetStep, stepValue),
        ...(hasValidateFields
          ? { validate: this.createStepValidateFn(targetStep) }
          : {}),
        ...additionalProps?.(step),
      } as never;
    }

    return enriched;
  }
}
