import {
  createCtx,
  type AnyResolvedStep,
  type CreatedHelperFnInput,
  type fields,
  type InferStepOptions,
  type Step,
  type StepNumbers,
} from '@/steps';
import { HelperFn, HelperFnChosenSteps } from '@/steps/fn-utils/helper-fn';
import type {
  HelperFnInput,
  HelperFnOptions,
} from '@/steps/fn-utils/helper-fn/utils';
import type { ResetFn } from '@/steps/fn-utils/reset-fn';
import type { UpdateFn } from '@/steps/fn-utils/update-fn';
import { steps } from '@/steps/steps';
import { functionalUpdate, omit } from '@/steps/utils';
import type { BaseStorageConfig, DefaultStorageKey } from '@/storage';
import {
  invariant,
  MultiStepFormLogger,
  type CasingType,
  type DeepKeys,
  type DefaultCasing,
} from '@/utils';
import {
  comparePartialArray,
  printErrors,
  typedObjectKeys,
} from '@/utils/helpers';
import { createInvariant, type Invariant } from '@/utils/invariant';
import { path } from '@/utils/path';
import {
  runStandardValidation,
  type StandardSchemaValidator,
} from '@/utils/validator';
import { isTupleNotation, isValidStepKey } from './utils';

export type InternalOptions<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TResolvedStep extends AnyResolvedStep,
  additionalEnrichedProps extends Record<string, unknown>
> = {
  originalValue: InferStepOptions<TStep>;
  additionalEnrichedProps?: (step: number) => additionalEnrichedProps;
  /**
   * The resolved multi step form values.
   */
  getValue: () => TResolvedStep;
  /**
   * A function used for setting the `value`. It is called after the
   * `value` is updated successfully.
   * @param value The updated and enriched multi step form values.
   * @returns
   */
  setValue: (value: TResolvedStep) => void;
};

function verifyUpdate<def, paths extends DeepKeys<def>>(options: {
  strict: boolean;
  partial: boolean;
  silenceErrors: boolean;
  obj: def;
  paths: paths[];
  actual: path.pickBy<def, paths>;
}) {
  const { strict, partial, actual, obj, paths, silenceErrors } = options;

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
    invariant(
      isValid,
      `[update]: found value mismatches in ${path.printMismatches({
        ok,
        mismatches,
      })}`
    );
  }
}

export namespace MultiStepFormStepSchemaInternal {
  export interface Options<
    def extends StepSchema.Config,
    value extends steps.instantiateSteps<def> = steps.instantiateSteps<def>,
    additionalEnrichedProps extends Record<string, unknown> = {}
  > {
    originalValue: def['steps'];
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
  export interface Config<
    TCasing extends CasingType = DefaultCasing,
    TStorageKey extends string = string
  > extends steps.instantiateConfig,
      fields.NameTransformCasingOptions<TCasing> {
    /**
     * The options for the storage module.
     */
    storage?: BaseStorageConfig<TStorageKey>;
  }

  export type inferStorageKey<T> = T extends Config
    ? undefined extends T['storage']
      ? DefaultStorageKey
      : T['storage'] extends { key: infer key extends string }
      ? key
      : DefaultStorageKey
    : DefaultStorageKey;

  export type inferStepNumbers<T> = T extends Config
    ? T['steps'] extends Record<string, unknown>
      ? StepNumbers<T['steps']>
      : never
    : never;
  export type inferStepKeys<T> = T extends Config
    ? T['steps'] extends Record<string, unknown>
      ? keyof T['steps']
      : never
    : never;

  export type instantiateStepSchema<T> = [T] extends [object]
    ? T extends Config
      ? {}
      : {}
    : {};
}

export class MultiStepFormStepSchemaInternal<
  const def extends StepSchema.Config,
  value extends steps.instantiateSteps<def> = steps.instantiateSteps<def>,
  additionalEnrichedProps extends Record<string, unknown> = {}
> {
  readonly #originalValue: def['steps'];
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
    const { getValue, setValue, originalValue, additionalEnrichedProps } =
      options;

    this.#originalValue = originalValue;
    this.#getValue = getValue;
    this.#setValue = setValue;
    this.#additionalEnrichedProps = additionalEnrichedProps;
  }

  private handlePostUpdate(value: value) {
    this.#setValue(this.enrichValues(value));
  }

  private buildCtxData<
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
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
    invariant(
      typeof ctxData === 'function',
      '[update]: "ctxData" must be a function'
    );
    logger.info('Custom "ctx" will be used');

    const additionalCtx = ctxData({ ctx: values as never });

    invariant(
      typeof additionalCtx === 'object' &&
        Object.keys(additionalCtx).length > 0,
      '[update]: "ctxData" must return an object with keys'
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
    targetStep extends steps.StepNumbers<value>,
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
    invariant(
      isValidStepKey(this.value, targetStep),
      `[update]: The target step ${targetStep} isn't a valid step. Please select a valid step`
    );

    const { [targetStep]: currentStep, ...values } = this.value;

    invariant(
      'updater' in options,
      '[update]: No "updater" was found. Please provide a value to the "updater" property'
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
      invariant(
        typeof updated === 'object',
        '[update]: "updater" must be an object or a function that returns an object'
      );

      const functionKeys = new Set(['update', 'reset', 'createHelperFn']);
      const stepKeys = Object.keys(this.value);
      const updaterResultKeys = Object.keys(
        updated as Record<string, unknown>
      ).filter((value) => !functionKeys.has(value));
      const missingKeys = stepKeys.filter(
        (key) => !updaterResultKeys.includes(key)
      );

      for (const stepKey of stepKeys) {
        // TODO create proper type for this
        // @ts-expect-error - we know the keys are present
        const { update, reset, createHelperFn, ...currentStep } =
          this.value[stepKey as keyof value];

        invariant(
          updaterResultKeys.length === Object.keys(currentStep).length,
          (formatter) => {
            return `[update]: "updater" is missing keys ${formatter.format(
              missingKeys
            )}`;
          }
        );
        const functions = { update, reset, createHelperFn };
        const obj = { ...currentStep, update, reset, createHelperFn };
        const paths = path.createDeep(obj);
        const actual: Record<string, unknown> = {
          ...updated,
          ...functions,
        };

        verifyUpdate({
          strict,
          partial,
          silenceErrors,
          obj,
          paths,
          actual: actual as never,
        });

        logger.info('The entire step will be updated');

        const currentUpdatedValue = updatedValue[
          stepKey as keyof value
        ] as Record<string, unknown>;
        const updatedAtPath = path.updateAt({
          obj: currentUpdatedValue,
          paths,
          value: actual as never,
          partial,
        });

        updatedValue = {
          ...updatedValue,
          [targetStep]: updatedAtPath,
        };

        this.handlePostUpdate(updatedValue);
        logger.info(
          `The new value is: ${JSON.stringify(updatedValue, null, 2)}`
        );
      }

      return;
    }

    const currentStepDeepKeys = path.createDeep(currentStep);

    if (Array.isArray(fields)) {
      const compareResult = comparePartialArray(currentStepDeepKeys, fields);

      invariant(
        compareResult.status === 'success',
        `[update]: Found errors with the provided fields\n${
          compareResult.status === 'error'
            ? printErrors(compareResult.errors)
            : ''
        }`
      );

      verifyUpdate({
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

      invariant(
        compareResult.status === 'success',
        `[update]: Found errors with the provided fields\n${
          compareResult.status === 'error'
            ? printErrors(compareResult.errors)
            : ''
        }`
      );

      // TODO validate all values (deepest) are `true`
      verifyUpdate({
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

  createStepUpdaterFn<targetStep extends steps.StepNumbers<value>>(
    targetStep: targetStep
  ): UpdateFn.stepSpecific<value, targetStep> {
    return (options) => {
      this.createStepUpdaterFnImpl({ targetStep, ...options });
    };
  }

  update<
    targetStep extends steps.StepNumbers<value>,
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
    targetStep extends steps.StepNumbers<value>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>
  >(config: {
    targetStep: targetStep;
    values: AnyResolvedStep;
    updatedValues: AnyResolvedStep;
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

      config.updatedValues = {
        ...config.updatedValues,
        ...path.updateAt({
          obj: values,
          paths: resolvedFields,
          value: picked,
        }),
      };

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
    targetStep extends steps.StepNumbers<value>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>
  >(options: ResetFn.Options<value, targetStep, fields, currentStep>) {
    const { fields = 'all', targetStep, debug } = options;
    const logger = new MultiStepFormLogger({
      debug,
      prefix: (value) => `${value}:reset${targetStep}`,
    });
    invariant(
      fields,
      '[update]: "fields" must have a value when "type" is "reset"'
    );

    const originalValues = steps.instantiate({
      steps: this.#originalValue,
    });
    const enrichedOriginalValues = this.enrichValues(
      originalValues,
      this.#additionalEnrichedProps
    );

    if (fields === 'all') {
      logger.info(`Resetting all fields for ${targetStep}`);
      this.handlePostUpdate(enrichedOriginalValues as value);
      logger.info(`Reset all fields for ${targetStep}`);
    }

    let updatedValues = { ...enrichedOriginalValues };
    const reset = this.resetFields<targetStep, currentStep>({
      logger,
      targetStep,
      updatedValues,
      values: enrichedOriginalValues,
    });

    if (isTupleNotation<DeepKeys<currentStep>>(fields)) {
      reset(fields);
    }

    if (typeof fields === 'object' && Object.keys(fields).length > 0) {
      const keys = path.createDeep(fields);

      reset(keys as never);
    }
  }

  createStepResetterFn<targetStep extends steps.StepNumbers<value>>(
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
    targetStep extends steps.StepNumbers<value>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<value, targetStep>
  >(options: ResetFn.Options<value, targetStep, fields, currentStep>) {
    this.createStepResetterFnImpl(options);
  }

  createHelperFnInputUpdate<
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  >(chosenSteps: chosenSteps) {
    if (HelperFnChosenSteps.isAll(chosenSteps)) {
      const stepSpecificUpdateFn = typedObjectKeys(this.value).reduce(
        (acc, key) => {
          (acc as any)[key] = this.createStepUpdaterFn(key as never);

          return acc;
        },
        {} as UpdateFn.createHelperFnForAllSteps<value, chosenSteps>
      );
      const update = Object.assign(
        this.update,
        stepSpecificUpdateFn
      ) as UpdateFn.HelperFn<value, chosenSteps>;

      return update;
    }

    const validKeys = Object.keys(this.value);

    if (HelperFnChosenSteps.isTuple<def, value>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = chosenSteps.reduce((acc, step) => {
        (acc as any)[step] = this.createStepUpdaterFn(step);

        return acc;
      }, {} as UpdateFn.createHelperFnForTupleSteps<value, chosenSteps>);
      const update = Object.assign(
        this.update,
        stepSpecificUpdateFn
      ) as UpdateFn.HelperFn<value, chosenSteps>;

      return update;
    }

    if (HelperFnChosenSteps.isObject<def, value>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = typedObjectKeys(chosenSteps).reduce(
        (acc, key) => {
          (acc as any)[key] = this.createStepUpdaterFn(key as never);

          return acc;
        },
        {} as UpdateFn.createHelperFnForObjectSteps<value, chosenSteps>
      );
      const update = Object.assign(
        this.update,
        stepSpecificUpdateFn
      ) as UpdateFn.HelperFn<value, chosenSteps>;

      return update;
    }

    throw new TypeError(`[update]: ${HelperFnChosenSteps.CATCH_ALL_MESSAGE}`);
  }

  createHelperFnInputReset<
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  >(chosenSteps: chosenSteps) {
    if (HelperFnChosenSteps.isAll(chosenSteps)) {
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
    }

    const validKeys = Object.keys(this.value);

    if (HelperFnChosenSteps.isTuple<def, value>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = chosenSteps.reduce((acc, step) => {
        (acc as any)[step] = this.createStepResetterFn(step as never);

        return acc;
      }, {} as ResetFn.createHelperFnForTupleSteps<value, chosenSteps>);
      const reset = Object.assign(
        this.reset,
        stepSpecificUpdateFn
      ) as ResetFn.HelperFn<value, chosenSteps>;

      return reset;
    }

    if (HelperFnChosenSteps.isObject<def, value>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = typedObjectKeys(chosenSteps).reduce(
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
    }

    throw new TypeError(`[update]: ${HelperFnChosenSteps.CATCH_ALL_MESSAGE}`);
  }

  createStepHelperFn<
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
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
        return (input?: CreatedHelperFnInput<validator>) => {
          // Create ctx fresh each time the function is called to ensure it has the latest this.value
          let ctx = createCtx(this.value, stepData);

          if ('validator' in optionsOrFunction) {
            invariant(
              typeof input === 'object',
              'An input is expected since you provided a validator'
            );

            runStandardValidation(
              optionsOrFunction.validator as StandardSchemaValidator,
              input.data
            );

            if (optionsOrFunction.ctxData) {
              const chosenStepsType = HelperFnChosenSteps.resolveType<
                value,
                chosenSteps
              >(stepData);
              const ctxData = optionsOrFunction.ctxData;

              invariant(
                typeof ctxData === 'function',
                'Option "ctxData" must be a function'
              );

              const logger = new MultiStepFormLogger({
                debug: false,
                prefix: (value) => `${value}:ctxData`,
              });
              let additionalCtx: Record<string, unknown> = {};

              if (chosenStepsType === 'all') {
                // Allow **all** steps to be selected
                additionalCtx = this.buildCtxData({
                  ctxData,
                  values: this.value,
                  logger,
                });
              }

              if (chosenStepsType === 'tuple') {
                // Allow the non-selected steps to be selected
                const targetSteps = HelperFnChosenSteps.createTupleNotation(
                  ...(stepData as HelperFnChosenSteps.tupleNotation<
                    steps.StepNumbers<value>
                  >)
                );
                const values = omit(this.value, targetSteps);

                additionalCtx = this.buildCtxData({
                  ctxData,
                  values,
                  logger,
                });
              }

              if (chosenStepsType === 'object') {
                // Allow the non-selected steps to be selected
                const targetSteps = Object.keys(
                  stepData
                ) as steps.StepNumbers<value>[];
                const values = omit(this.value, targetSteps);

                additionalCtx = this.buildCtxData({
                  ctxData,
                  values,
                  logger,
                });
              }

              ctx = {
                ...ctx,
                ...additionalCtx,
              } as never;
            }

            return fn({
              ctx: ctx as never,
              ...functions,
              ...input,
            });
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
    const invariant: Invariant = createInvariant('[enrichValues]');

    invariant(
      typeof values === 'object' && values !== null,
      'The values must be an object'
    );

    if (additionalProps) {
      invariant(
        typeof additionalProps === 'function',
        'The additional props must be a function'
      );
    }

    let enriched = { ...values };

    for (const [key, stepValue] of Object.entries(enriched)) {
      const targetStep = key as steps.StepNumbers<value>;
      const step = Number.parseInt(targetStep.replace('step', ''));
      // const { step, targetStep } = this.extractStepFromKey(key);

      invariant(
        typeof stepValue === 'object' && stepValue !== null,
        `The value for ${key} must be an object`
      );

      enriched[targetStep as keyof values] = {
        ...stepValue,
        update: this.createStepUpdaterFn(targetStep),
        reset: this.createStepResetterFn(targetStep),
        createHelperFn: this.createStepHelperFn([targetStep]),
        ...additionalProps?.(step),
      } as never;
    }

    return enriched;
  }
}
