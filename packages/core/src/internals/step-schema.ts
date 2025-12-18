import {
  createCtx,
  HelperFnChosenSteps,
  type AnyResolvedStep,
  type CreatedHelperFnInput,
  type CreateHelperFunctionOptionsWithoutValidator,
  type CreateHelperFunctionOptionsWithValidator,
  type CtxDataSelector,
  type HelperFnCtx,
  type helperFnResetFn,
  type HelperFnResetFn,
  type helperFnUpdateFn,
  type HelperFnUpdateFn,
  type HelperFnWithoutValidator,
  type HelperFnWithValidator,
  type InferStepOptions,
  type ResetFn,
  type Step,
  type StepNumbers,
  type UpdateFn,
  type ValidStepKey,
} from '@/steps';
import { functionalUpdate } from '@/steps/utils';
import {
  invariant,
  MultiStepFormLogger,
  type CasingType,
  type DeepKeys,
} from '@/utils';
import {
  comparePartialArray,
  printErrors,
  typedObjectKeys,
} from '@/utils/helpers';
import { path } from '@/utils/path';
import {
  runStandardValidation,
  type StandardSchemaValidator,
} from '@/utils/validator';
import { createStep, isTupleNotation, isValidStepKey } from './utils';

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
  obj: def;
  paths: paths[];
  actual: path.pickBy<def, paths>;
}) {
  const { strict, partial, actual, obj, paths } = options;

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

  invariant(
    isValid,
    `[update]: found value mismatches in ${path.printMismatches({
      ok,
      mismatches,
    })}`
  );
}

export class MultiStepFormStepSchemaInternal<
  step extends Step<casing>,
  casing extends CasingType,
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends StepNumbers<resolvedStep>,
  additionalEnrichedProps extends Record<string, unknown> = {}
> {
  readonly #originalValue: InferStepOptions<step>;
  readonly #additionalEnrichedProps?: (step: number) => additionalEnrichedProps;
  readonly #getValue: () => resolvedStep;
  readonly #setValue: (value: resolvedStep) => void;

  private get value() {
    return this.#getValue();
  }

  constructor(
    options: InternalOptions<
      step,
      casing,
      resolvedStep,
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

  private handlePostUpdate(value: resolvedStep) {
    this.#setValue(this.enrichValues(value));
  }

  private buildCtxData<
    targetStep extends ValidStepKey<stepNumbers>,
    additionalCtx extends Record<string, unknown>
  >(
    options: Required<
      CtxDataSelector<resolvedStep, stepNumbers, [targetStep], additionalCtx>
    > & {
      values: Omit<resolvedStep, targetStep>;
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
    targetStep extends ValidStepKey<stepNumbers>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<resolvedStep, stepNumbers, targetStep>
    >,
    strict extends boolean,
    partial extends boolean,
    additionalCtx extends Record<string, unknown>,
    additionalUpdaterData extends UpdateFn.additionalUpdaterData
  >(
    options: UpdateFn.options<
      resolvedStep,
      stepNumbers,
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
    } = options;
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
      };
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
        const { update, reset, createHelperFn, ...currentStep } = this.value[
          stepKey
        ] as resolvedStep[keyof resolvedStep];

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
          obj,
          paths,
          actual: actual as never,
        });

        logger.info('The entire step will be updated');

        const currentUpdatedValue = updatedValue[stepKey] as Record<
          string,
          unknown
        >;
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
          obj: currentStep,
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
        obj: currentStep,
        paths: keys as never,
        actual: updated as never,
      });

      updatedValue = {
        ...updatedValue,
        [targetStep]: path.updateAt({
          obj: currentStep,
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

  createStepUpdaterFn<targetStep extends ValidStepKey<stepNumbers>>(
    targetStep: targetStep
  ): UpdateFn.stepSpecific<resolvedStep, stepNumbers, targetStep> {
    return (options) => {
      this.createStepUpdaterFnImpl({ targetStep, ...options });
    };
  }

  update<
    targetStep extends ValidStepKey<stepNumbers>,
    field extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<resolvedStep, stepNumbers, targetStep>
    > = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends UpdateFn.additionalUpdaterData = never
  >(
    options: UpdateFn.options<
      resolvedStep,
      stepNumbers,
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
    targetStep extends ValidStepKey<stepNumbers>,
    currentStep extends UpdateFn.resolvedStep<
      resolvedStep,
      stepNumbers,
      targetStep
    >
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
      const picked = path.pickBy<resolvedStep, DeepKeys<resolvedStep>>(
        values,
        ...(resolvedFields as any)
      );

      config.updatedValues = {
        ...config.updatedValues,
        ...path.updateAt({
          obj: values,
          paths: fields,
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
    targetStep extends ValidStepKey<stepNumbers>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<
      resolvedStep,
      stepNumbers,
      targetStep
    >
  >(
    options: ResetFn.Options<
      resolvedStep,
      stepNumbers,
      targetStep,
      fields,
      currentStep
    >
  ) {
    const { fields = 'all', targetStep, debug } = options;
    const logger = new MultiStepFormLogger({
      debug,
      prefix: (value) => `${value}:reset${targetStep}`,
    });
    invariant(
      fields,
      '[update]: "fields" must have a value when "type" is "reset"'
    );

    const originalValues = createStep(this.#originalValue);
    const enrichedOriginalValues = this.enrichValues<
      resolvedStep,
      additionalEnrichedProps
    >(originalValues as never, this.#additionalEnrichedProps);

    if (fields === 'all') {
      logger.info(`Resetting all fields for ${targetStep}`);
      this.handlePostUpdate(enrichedOriginalValues);
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

  createStepResetterFn<targetStep extends ValidStepKey<stepNumbers>>(
    targetStep: targetStep
  ): ResetFn.stepSpecific<resolvedStep, stepNumbers, targetStep> {
    return (options) => {
      return this.createStepResetterFnImpl({
        targetStep,
        fields: options?.fields ?? 'all',
        debug: options?.debug ?? false,
      });
    };
  }

  reset<
    targetStep extends ValidStepKey<stepNumbers>,
    fields extends UpdateFn.chosenFields<currentStep>,
    currentStep extends UpdateFn.resolvedStep<
      resolvedStep,
      stepNumbers,
      targetStep
    >
  >(
    options: ResetFn.Options<
      resolvedStep,
      stepNumbers,
      targetStep,
      fields,
      currentStep
    >
  ) {
    this.createStepResetterFnImpl(options);
  }

  createHelperFnInputUpdate<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(chosenSteps: chosenSteps) {
    if (HelperFnChosenSteps.isAll(chosenSteps)) {
      const stepSpecificUpdateFn = typedObjectKeys<
        resolvedStep,
        ValidStepKey<stepNumbers>
      >(this.value).reduce((acc, key) => {
        acc[key] = this.createStepUpdaterFn(key);

        return acc;
      }, {} as helperFnUpdateFn<resolvedStep, stepNumbers, ValidStepKey<stepNumbers>>);
      const update = Object.assign(
        this.update,
        stepSpecificUpdateFn
      ) as HelperFnUpdateFn<resolvedStep, stepNumbers, chosenSteps>;

      return update;
    }

    const validKeys = Object.keys(this.value);

    if (HelperFnChosenSteps.isTuple<stepNumbers>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = chosenSteps.reduce((acc, step) => {
        acc[step] = this.createStepUpdaterFn(step);

        return acc;
      }, {} as helperFnUpdateFn<resolvedStep, stepNumbers, ValidStepKey<stepNumbers>>);
      const update = Object.assign(
        this.update,
        stepSpecificUpdateFn
      ) as HelperFnUpdateFn<resolvedStep, stepNumbers, chosenSteps>;

      return update;
    }

    if (HelperFnChosenSteps.isObject<stepNumbers>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = typedObjectKeys<
        HelperFnChosenSteps.objectNotation<`step${stepNumbers}`>,
        ValidStepKey<stepNumbers>
      >(chosenSteps).reduce((acc, key) => {
        acc[key] = this.createStepUpdaterFn(key);

        return acc;
      }, {} as helperFnUpdateFn<resolvedStep, stepNumbers, ValidStepKey<stepNumbers>>);
      const update = Object.assign(
        this.update,
        stepSpecificUpdateFn
      ) as HelperFnUpdateFn<resolvedStep, stepNumbers, chosenSteps>;

      return update;
    }

    throw new TypeError(`[update]: ${HelperFnChosenSteps.CATCH_ALL_MESSAGE}`);
  }

  createHelperFnInputReset<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(chosenSteps: chosenSteps) {
    if (HelperFnChosenSteps.isAll(chosenSteps)) {
      const stepSpecificUpdateFn = typedObjectKeys<
        resolvedStep,
        ValidStepKey<stepNumbers>
      >(this.value).reduce((acc, key) => {
        acc[key] = this.createStepResetterFn(key);

        return acc;
      }, {} as helperFnResetFn<resolvedStep, stepNumbers, ValidStepKey<stepNumbers>>);
      const reset = Object.assign(
        this.reset,
        stepSpecificUpdateFn
      ) as HelperFnResetFn<resolvedStep, stepNumbers, chosenSteps>;

      return reset;
    }

    const validKeys = Object.keys(this.value);

    if (HelperFnChosenSteps.isTuple<stepNumbers>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = chosenSteps.reduce((acc, step) => {
        acc[step] = this.createStepResetterFn(step);

        return acc;
      }, {} as helperFnResetFn<resolvedStep, stepNumbers, ValidStepKey<stepNumbers>>);
      const reset = Object.assign(
        this.reset,
        stepSpecificUpdateFn
      ) as HelperFnResetFn<resolvedStep, stepNumbers, chosenSteps>;

      return reset;
    }

    if (HelperFnChosenSteps.isObject<stepNumbers>(chosenSteps, validKeys)) {
      const stepSpecificUpdateFn = typedObjectKeys<
        HelperFnChosenSteps.objectNotation<`step${stepNumbers}`>,
        ValidStepKey<stepNumbers>
      >(chosenSteps).reduce((acc, key) => {
        acc[key] = this.createStepResetterFn(key);

        return acc;
      }, {} as helperFnResetFn<resolvedStep, stepNumbers, ValidStepKey<stepNumbers>>);
      const reset = Object.assign(
        this.reset,
        stepSpecificUpdateFn
      ) as HelperFnResetFn<resolvedStep, stepNumbers, chosenSteps>;

      return reset;
    }

    throw new TypeError(`[update]: ${HelperFnChosenSteps.CATCH_ALL_MESSAGE}`);
  }

  createStepHelperFn<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: chosenSteps) {
    return <validator, additionalCtx extends Record<string, unknown>, response>(
      optionsOrFunction:
        | Omit<
            CreateHelperFunctionOptionsWithValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps,
              validator,
              additionalCtx
            >,
            'stepData'
          >
        | Omit<
            CreateHelperFunctionOptionsWithoutValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps
            >,
            'stepData'
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            additionalCtx,
            response
          >,
      fn:
        | HelperFnWithValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            validator,
            additionalCtx,
            response
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
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
          const ctx = createCtx<resolvedStep, stepNumbers, chosenSteps>(
            this.value,
            stepData
          ) as never;
          return optionsOrFunction({
            ctx,
            ...functions,
          });
        };
      }

      if (typeof optionsOrFunction === 'object') {
        return (input?: CreatedHelperFnInput<validator>) => {
          // Create ctx fresh each time the function is called to ensure it has the latest this.value
          const ctx = createCtx<resolvedStep, stepNumbers, chosenSteps>(
            this.value,
            stepData
          ) as never;

          if ('validator' in optionsOrFunction) {
            invariant(
              typeof input === 'object',
              'An input is expected since you provided a validator'
            );

            runStandardValidation(
              optionsOrFunction.validator as StandardSchemaValidator,
              input.data
            );

            let resolvedCtx = ctx as HelperFnCtx<
              resolvedStep,
              stepNumbers,
              chosenSteps
            >;

            if (optionsOrFunction.ctxData) {
              const currentStepKey = (
                stepData as HelperFnChosenSteps.tupleNotation<
                  ValidStepKey<stepNumbers>
                >
              )[0] as keyof resolvedStep;
              const { [currentStepKey]: _, ...values } = this.value;

              resolvedCtx = {
                ...resolvedCtx,
                ...optionsOrFunction.ctxData({ ctx: values as never }),
              };
            }

            return fn({
              ctx: resolvedCtx as never,
              ...functions,
              ...input,
            });
          }

          return (
            fn as HelperFnWithoutValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps,
              additionalCtx,
              response
            >
          )({
            ctx,
            ...functions,
          });
        };
      }

      throw new Error(
        `The first argument must be a function or an object, (was ${typeof optionsOrFunction})`
      );
    };
  }

  private extractStepFromKey(key: string) {
    const [targetStep] = [key] as HelperFnChosenSteps.tupleNotation<
      ValidStepKey<stepNumbers>
    >;
    const step = Number.parseInt(targetStep.replace('step', '')) as stepNumbers;

    return { targetStep, step };
  }

  enrichValues<
    values extends AnyResolvedStep,
    additionalProps extends Record<string, unknown>
  >(values: values, additionalProps?: (step: number) => additionalProps) {
    let enriched = { ...values };

    for (const [key, stepValue] of Object.entries(enriched)) {
      const { step, targetStep } = this.extractStepFromKey(key);

      enriched[targetStep] = {
        ...stepValue,
        update: this.createStepUpdaterFn(targetStep),
        reset: this.createStepResetterFn(targetStep),
        createHelperFn: this.createStepHelperFn([targetStep]),
        ...additionalProps?.(step),
      };
    }

    return enriched;
  }
}
