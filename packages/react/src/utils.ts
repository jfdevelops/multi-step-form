import {
  invariant,
  type HelperFnChosenSteps,
  type HelperFnCtx,
  type MultiStepFormLogger,
  type StepNumbers,
  type ValidStepKey,
} from '@jfdevelops/multi-step-form-core';
import type { AnyResolvedStep, StepSpecificComponent } from './step-schema';

export function resolvedCtxCreator<
  resolvedStep extends AnyResolvedStep,
  stepNumbers extends StepNumbers<resolvedStep>
>(
  logger: MultiStepFormLogger,
  values: Omit<resolvedStep, `step${stepNumbers}`>
) {
  return function <
    chosenStep extends HelperFnChosenSteps.tupleNotation<
      ValidStepKey<stepNumbers>
    >,
    additionalCtx
  >(
    options: Required<
      StepSpecificComponent.CtxSelector<
        resolvedStep,
        stepNumbers,
        chosenStep,
        additionalCtx
      >
    > & { ctx: HelperFnCtx<resolvedStep, stepNumbers, chosenStep> }
  ) {
    const { ctx, ctxData } = options;

    logger.info('Option "ctxData" is defined');
    invariant(
      typeof ctxData === 'function',
      'Option "ctxData" must be a function'
    );

    const additionalCtx = ctxData({ ctx: values } as never);

    logger.info(
      `Addition context is: ${JSON.stringify(additionalCtx, null, 2)}`
    );

    const resolvedCtx = {
      ...ctx,
      ...additionalCtx,
    };

    logger.info(`Resolved context is: ${JSON.stringify(resolvedCtx, null, 2)}`);

    return resolvedCtx;
  };
}
