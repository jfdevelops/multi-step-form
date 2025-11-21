import {
  createCtx,
  HelperFnChosenSteps,
  type AnyResolvedStep,
  type CreatedHelperFnInput,
  type CreateHelperFunctionOptionsWithoutValidator,
  type CreateHelperFunctionOptionsWithValidator,
  type HelperFnCtx,
  type helperFnUpdateFn,
  type HelperFnUpdateFn,
  type HelperFnWithoutValidator,
  type HelperFnWithValidator,
  type StepNumbers,
  type UpdateFn,
  type ValidStepKey
} from '@/steps';
import { functionalUpdate } from '@/steps/utils';
import { invariant, type Constrain } from '@/utils';
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

export type InternalOptions<T extends AnyResolvedStep> = {
  /**
   * The resolved multi step form values.
   */
  value: T;
  /**
   * A function used for setting the `value`. It is called after the
   * `value` is updated successfully.
   * @param value The updated and enriched multi step form values.
   * @returns
   */
  setValue: (value: T) => void;
};
export function isValidStepKey<T extends AnyResolvedStep>(
  steps: T,
  stepKey: string
): stepKey is Constrain<keyof T, string> {
  return Object.keys(steps).includes(stepKey);
}

export class MultiStepFormStepSchemaInternal<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends StepNumbers<resolvedStep>
> {
  readonly value: resolvedStep;
  readonly #setValue: (value: resolvedStep) => void;

  constructor(options: InternalOptions<resolvedStep>) {
    const { value, setValue } = options;

    this.value = value;
    this.#setValue = setValue;
  }

  private handlePostUpdate(value: resolvedStep) {
    this.#setValue(this.enrichValues(value));
  }

  private createStepUpdaterFnImpl<
    targetStep extends ValidStepKey<stepNumbers>,
    fields extends UpdateFn.chosenFields<currentStep>,
    additionalCtx extends Record<string, unknown>,
    currentStep extends UpdateFn.resolvedStep<
      resolvedStep,
      stepNumbers,
      targetStep
    >
  >(
    options: UpdateFn.options<
      resolvedStep,
      stepNumbers,
      targetStep,
      fields,
      additionalCtx,
      currentStep
    >
  ) {
    const { targetStep, updater, ctxData, fields = 'all' } = options;

    invariant(
      isValidStepKey(this.value, targetStep),
      `[update]: The target step ${targetStep} isn't a valid step. Please select a valid step`
    );

    const { [targetStep]: currentStep, ...values } = this.value;
    let updatedValue = { ...this.value };

    let ctx = createCtx(updatedValue, [targetStep]);

    // Build the `ctx` first
    if (ctxData) {
      invariant(
        typeof ctxData === 'function',
        '[update]: "ctxData" must be a function'
      );

      const additionalCtx = ctxData({ ctx: values as never });

      invariant(
        typeof additionalCtx === 'object' &&
          Object.keys(additionalCtx).length > 0,
        '[update]: "ctxData" must return an object with keys'
      );

      ctx = {
        ...ctx,
        ...additionalCtx,
      };
    }

    const updated = functionalUpdate(updater, {
      ctx: ctx as never,
      update: this.createHelperFnInputUpdate([targetStep]),
    });

    // TODO validate `updater` - will have to be done in each case (I think)

    // default case: updating all fields for the current step
    if (!fields) {
      invariant(
        typeof updated === 'object',
        '[update]: "updater" must be an object or a function that returns an object'
      );

      const stepKeys = Object.keys(this.value);
      const updaterResultKeys = Object.keys(updated as Record<string, unknown>);

      invariant(updaterResultKeys.length === stepKeys.length, () => {
        const missingKeys = stepKeys.filter(
          (key) => !updaterResultKeys.includes(key)
        );
        const formatter = new Intl.ListFormat('en', {
          style: 'long',
          type: 'conjunction',
        });

        return `[update]: "updater" is missing keys ${formatter.format(
          missingKeys
        )}`;
      });
      const paths = path.createDeep(this.value);

      const { mismatches, ok } = path.equalsAtPaths(
        this.value,
        paths,
        updated as never
      );

      invariant(
        ok && mismatches.length === 0,
        `[update]: found value mismatches in ${path.printMismatches({
          mismatches,
          ok,
        })}`
      );

      updatedValue = {
        ...updatedValue,
        [targetStep]: path.updateAt(updatedValue, paths, updated as never),
      };

      this.handlePostUpdate(updatedValue);

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

      const { mismatches, ok } = path.equalsAtPaths(
        currentStep,
        fields,
        updated as never
      );

      invariant(
        ok && mismatches.length === 0,
        `[update]: found value mismatches in ${path.printMismatches({
          ok,
          mismatches,
        })}`
      );

      updatedValue = {
        ...updatedValue,
        [targetStep]: path.updateAt(currentStep, fields, updated as never),
      };

      this.handlePostUpdate(updatedValue);

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
      const { mismatches, ok } = path.equalsAtPaths(
        currentStep,
        keys as never,
        updated as never
      );

      invariant(
        ok && mismatches.length === 0,
        `[update]: found value mismatches in ${path.printMismatches({
          ok,
          mismatches,
        })}`
      );

      updatedValue = {
        ...updatedValue,
        [targetStep]: path.updateAt(
          currentStep,
          keys as never,
          updated as never
        ),
      };

      this.handlePostUpdate(updatedValue);

      return;
    }

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
    additionalCtx extends Record<string, unknown> = {}
  >(
    options: UpdateFn.options<
      resolvedStep,
      stepNumbers,
      targetStep,
      field,
      additionalCtx
    >
  ) {
    return this.createStepUpdaterFnImpl(options);
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
      const ctx = createCtx<resolvedStep, stepNumbers, chosenSteps>(
        this.value,
        stepData
      ) as never;
      const createInputUpdateFn = this.createHelperFnInputUpdate(stepData);

      if (typeof optionsOrFunction === 'function') {
        return () =>
          optionsOrFunction({
            ctx,
            update: createInputUpdateFn,
          });
      }

      if (typeof optionsOrFunction === 'object') {
        return (input?: CreatedHelperFnInput<validator>) => {
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
              update: createInputUpdateFn,
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
            update: createInputUpdateFn,
          });
        };
      }

      throw new Error(
        `The first argument must be a function or an object, (was ${typeof optionsOrFunction})`
      );
    };
  }

  enrichValues<
    values extends AnyResolvedStep,
    additionalProps extends Record<string, unknown>
  >(values: values, additionalProps?: (step: number) => additionalProps) {
    for (const [key, stepValue] of Object.entries(values)) {
      const targetStep = [key] as HelperFnChosenSteps.tupleNotation<
        ValidStepKey<stepNumbers>
      >;
      const step = Number.parseInt(key.replace('step', '')) as stepNumbers;

      values = {
        ...values,
        [key as keyof resolvedStep]: {
          ...(stepValue as object),
          update: this.createStepUpdaterFn(targetStep[0]),
          createHelperFn: this.createStepHelperFn(targetStep),
          ...additionalProps?.(step),
        },
      };
    }

    return values;
  }
}
