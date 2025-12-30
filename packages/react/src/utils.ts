import {
  invariant,
  type Expand,
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
    > & { ctx: Expand<HelperFnCtx<resolvedStep, stepNumbers, chosenStep>> }
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

export function getValidatedCustomInputHooks(input: Record<string, unknown>) {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'function') {
      try {
        const result = value();
        // Verify the hook was actually called and returned a value
        // (hooks should always return something, even if it's undefined)
        result[key] = result;

        // In development, we can add additional verification here
        // Log hook calls for debugging (can be disabled in production by removing console.debug)
        // if (typeof console !== 'undefined' && console.debug) {
        //   console.debug(
        //     `[multi-step-form] Hook "${key}" called successfully`,
        //     { result: result === undefined ? 'defined' : 'undefined' }
        //   );
        // }
      } catch (error) {
        // Provide helpful error message if hook throws
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        throw new Error(
          `[multi-step-form] Error calling hook "${key}" in useFormInstance.render: ${errorMessage}\n\n` +
            `This usually means:\n` +
            `1. The hook is being called outside of a React component\n` +
            `2. The hook has invalid dependencies or configuration\n` +
            `3. There's an error in your hook implementation\n\n` +
            `Original error: ${errorMessage}`,
          { cause: error }
        );
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}
