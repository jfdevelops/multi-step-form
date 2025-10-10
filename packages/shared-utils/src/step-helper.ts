import type { casing } from '@multi-step-form/casing';
import {
  type Step,
  type ResolvedStep,
  type InferStepOptions,
  type StepNumbers,
  type HelperFnChosenSteps,
  step,
  type HelperFnCtx,
  type HelperFnWithoutValidator,
  type HelperFnInputWithValidator,
  type CreateHelperFunctionOptionsWithValidator,
  type CreateHelperFunctionOptionsWithoutValidator,
  type HelperFnWithValidator,
} from './step';
import {
  comparePartialArray,
  invariant,
  printErrors,
  runStandardValidation,
  type StandardSchemaValidator,
} from '@multi-step-form/runtime-utils';
import type { types } from '@multi-step-form/compile-time-utils';

export class MultiStepFormStepHelper<
  step extends Step<casing>,
  resolvedStep extends ResolvedStep<step, InferStepOptions<step>, casing>,
  stepNumbers extends StepNumbers<resolvedStep>,
  casing extends casing.CasingType
> {
  private readonly values: resolvedStep;
  private readonly stepNumbers: Array<stepNumbers>;

  constructor(
    resolvedStepValues: resolvedStep,
    stepNumbers: Array<stepNumbers>
  ) {
    this.stepNumbers = stepNumbers;
    this.values = resolvedStepValues;
  }

  createCtxHelper<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(data: string[]) {
    return data.reduce((acc, curr) => {
      const stepNumber = step.extractNumber(curr);

      acc[curr as keyof typeof acc] = step.get(this.values)({
        step: stepNumber as stepNumbers,
      }).data as never;

      return acc;
    }, {} as HelperFnCtx<resolvedStep, stepNumbers, chosenSteps>);
  }

  createCtx<chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>>(
    stepData: chosenSteps
  ) {
    const formatter = new Intl.ListFormat('en', {
      style: 'long',
      type: 'disjunction',
    });
    const validStepKeys = this.stepNumbers.map(
      (value) => `step${value}` as keyof resolvedStep
    );

    const baseErrorMessage = () => {
      return `"stepData" must be set to an array of available steps (${formatter.format(
        validStepKeys as string[]
      )})`;
    };

    if (stepData === 'all') {
      return this.stepNumbers.reduce((acc, curr) => {
        const stepKey = `step${curr}` as keyof HelperFnCtx<
          resolvedStep,
          stepNumbers,
          chosenSteps
        >;
        acc[stepKey] = step.get(this.values)({
          step: curr,
        }).data as never;

        return acc;
      }, {} as HelperFnCtx<resolvedStep, stepNumbers, chosenSteps>);
    }

    if (Array.isArray(stepData)) {
      invariant(
        stepData.every((step) =>
          validStepKeys.includes(step as keyof resolvedStep)
        ),
        () => {
          const comparedResults = comparePartialArray(
            stepData,
            this.stepNumbers,
            formatter
          );

          if (comparedResults.status === 'error') {
            return `${baseErrorMessage()}. See errors:\n ${printErrors(
              comparedResults.errors
            )}`;
          }

          return baseErrorMessage();
        }
      );

      return this.createCtxHelper<chosenSteps>(stepData);
    }

    if (typeof stepData === 'object') {
      const keys = Object.keys(stepData);

      invariant(
        keys.every((key) => validStepKeys.includes(key as keyof resolvedStep)),
        () => {
          const comparedResults = comparePartialArray(
            keys,
            validStepKeys as string[],
            formatter
          );

          if (comparedResults.status === 'error') {
            return `${baseErrorMessage()}. See errors:\n ${printErrors(
              comparedResults.errors
            )}`;
          }

          return baseErrorMessage();
        }
      );

      return this.createCtxHelper<chosenSteps>(keys);
    }

    throw new Error(`${baseErrorMessage()} OR to "all"`);
  }

  createStepHelperFnImpl<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(stepData: chosenSteps) {
    return <Validator, Response>(
      optionsOrFunction:
        | Omit<
            CreateHelperFunctionOptionsWithValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps,
              Validator
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
            Response
          >,
      fn:
        | HelperFnWithValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            Validator,
            Response
          >
        | HelperFnWithoutValidator<
            resolvedStep,
            stepNumbers,
            chosenSteps,
            Response
          >
    ) => {
      const ctx = this.createCtx(stepData);

      if (typeof optionsOrFunction === 'function') {
        return () => optionsOrFunction({ ctx });
      }

      if (typeof optionsOrFunction === 'object') {
        return (
          input?: types.Expand<
            Omit<
              HelperFnInputWithValidator<
                resolvedStep,
                stepNumbers,
                chosenSteps,
                Validator
              >,
              'ctx'
            >
          >
        ) => {
          if ('validator' in optionsOrFunction) {
            invariant(
              typeof input === 'object',
              'An input is expected since you provided a validator'
            );

            runStandardValidation(
              optionsOrFunction.validator as StandardSchemaValidator,
              input.data
            );

            return fn({ ctx, ...input });
          }

          return (
            fn as HelperFnWithoutValidator<
              resolvedStep,
              stepNumbers,
              chosenSteps,
              Response
            >
          )({ ctx });
        };
      }

      throw new Error(
        `The first argument must be a function or an object, (was ${typeof optionsOrFunction})`
      );
    };
  }
}
