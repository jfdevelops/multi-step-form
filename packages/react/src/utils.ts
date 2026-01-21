import {
  createCtx,
  invariant,
  type HelperFn,
  type HelperFnChosenSteps,
  type HelperFnInput,
  type MultiStepFormLogger,
  type steps
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import type { ReactNode } from 'react';
export function resolvedCtxCreator<
  def extends StepSchema.Config,
  value extends steps.instantiateSteps<def>,
>(
  logger: MultiStepFormLogger,
  values: Omit<value, `step${steps.StepNumbers<value>}`>
) {
  return function <
    chosenStep extends HelperFnChosenSteps.tupleNotation<
      steps.StepNumbers<value>
    >,
    additionalCtx extends Record<string, unknown> = {},
  >(
    options: Required<
      HelperFn.CtxDataSelector<value, chosenStep, additionalCtx>
    > &
      HelperFn.BaseInput<value, chosenStep>
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
        const hookResult = value();
        // Verify the hook was actually called and returned a value
        // (hooks should always return something, even if it's undefined)
        result[key] = hookResult;

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

export type CreateFunction<TArgs extends any[], TReturn = void> = (
  ...args: TArgs
) => TReturn;
export type CreateComponent<TInput, TProps> = CreateFunction<
  [input: TInput, props: TProps],
  ReactNode
>;
export type CreateComponentCallback<
  value extends steps.instantiateSteps,
  chosenSteps extends HelperFnChosenSteps.main<value, steps.StepNumbers<value>>,
  TProps,
> = CreateComponent<
  HelperFnInput.BaseInput<value, chosenSteps, never, {}>,
  TProps
>;
export type CreatedMultiStepFormComponent<TProps> = TProps extends undefined
  ? () => ReactNode
  : (props: TProps) => ReactNode;
export type CreateComponentImplOptions<
  value extends steps.instantiateSteps,
  chosenSteps extends HelperFnChosenSteps.main<value, steps.StepNumbers<value>>,
  props,
> = {
  value: value;
  options: HelperFn.BaseOptions<value, chosenSteps>;
  fn: CreateComponentCallback<value, chosenSteps, props>;
  input: (
    options: {
      ctx: HelperFn.buildCtx<value, chosenSteps>;
    } & HelperFn.BaseOptions<value, chosenSteps>
  ) => Omit<HelperFnInput.BaseInput<value, chosenSteps, never, {}>, 'ctx'>;
};
export function createComponent<
  value extends steps.instantiateSteps,
  chosenSteps extends HelperFnChosenSteps.main<value, steps.StepNumbers<value>>,
  props,
>({
  value,
  options,
  fn,
  input,
}: CreateComponentImplOptions<value, chosenSteps, props>) {
  const { stepData } = options;
  const ctx = createCtx(value, stepData) as never;

  return ((props?: props) =>
    fn(
      { ctx, ...input({ ctx, stepData }) },
      props as any
    )) as CreatedMultiStepFormComponent<props>;
}
