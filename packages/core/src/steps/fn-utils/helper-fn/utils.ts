import type { steps } from '@/steps/steps';
import type { HelperFn, HelperFnChosenSteps } from '../helper-fn';
import type { UpdateFn } from '../update-fn';
import type { ResetFn } from '../reset-fn';
import type {
  DefaultValidator,
  AnyValidator,
  ResolveValidatorOutput,
} from '@/utils/validator';
import type { Constrain, Expand } from '@/utils';
import type {
  CreatedHelperFnWithInput,
  HelperFnWithValidator,
  ValidStepKey,
} from '@/steps/types';

type RequiredInputFn<input, response> = (input: input) => response;
type OptionalInputFn<input, response> = (input?: input) => response;
type AllKeysRequired<T extends object> = keyof T extends never
  ? false
  : {
      [K in keyof T]-?: {} extends Pick<T, K> ? false : true;
    }[keyof T] extends false
  ? false
  : true;

export namespace HelperFnInput {
  export interface BaseInput<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    omitSteps extends HelperFnChosenSteps.resolve<
      value,
      stepNumbers,
      chosenSteps
    > = never,
    TAdditionalCtx extends Record<string, unknown> = {}
  > extends HelperFn.BaseInput<
      value,
      stepNumbers,
      chosenSteps,
      omitSteps,
      TAdditionalCtx
    > {
    /**
     * A function to update parts of the multi-step form schema.
     */
    update: UpdateFn.HelperFn<value, stepNumbers, chosenSteps>;
    /**
     * A useful wrapper for `update` to reset a specific field's value to its
     * original config value.
     */
    reset: ResetFn.HelperFn<value, stepNumbers, chosenSteps>;
  }
  export interface InputWithValidator<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    validator,
    additionalCtx extends Record<string, unknown> = {}
  > extends BaseInput<value, stepNumbers, chosenSteps, never, additionalCtx> {
    /**
     * The validated data from the validator.
     */
    data: ResolveValidatorOutput<validator>;
  }

  export interface InputWithoutValidator<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    additionalCtx extends Record<string, unknown> = {}
  > extends BaseInput<value, stepNumbers, chosenSteps, never, additionalCtx> {}

  export type WithValidator<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    validator,
    additionalCtx extends Record<string, unknown>,
    response
  > = RequiredInputFn<
    InputWithValidator<
      value,
      stepNumbers,
      chosenSteps,
      validator,
      additionalCtx
    >,
    response
  >;

  export type WithoutValidator<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    additionalCtx extends Record<string, unknown>,
    response
  > = RequiredInputFn<
    InputWithoutValidator<value, stepNumbers, chosenSteps, additionalCtx>,
    response
  >;
}

export namespace HelperFnOptions {
  export interface WithCustomCtx<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    additionalCtx extends Record<string, unknown>
  > extends HelperFn.BaseOptions<value, stepNumbers, chosenSteps>,
      HelperFn.CtxDataSelector<
        value,
        stepNumbers,
        chosenSteps,
        additionalCtx
      > {}
  export interface WithValidator<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    validator,
    additionalCtx extends Record<string, unknown>
  > extends WithCustomCtx<value, stepNumbers, chosenSteps, additionalCtx> {
    /**
     * A validator used to validate the params.
     */
    validator: Constrain<validator, AnyValidator, DefaultValidator>;
  }
  export interface WithoutValidator<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    additionalCtx extends Record<string, unknown>
  > extends WithCustomCtx<value, stepNumbers, chosenSteps, additionalCtx> {}
}

export namespace HelperFnOutput {
  export type Input<t, data = Expand<ResolveValidatorOutput<t>>> = [t] extends [
    object
  ]
    ? AllKeysRequired<t> extends true
      ? { data: data }
      : { data?: data }
    : { data: data };
  export type WithValidator<
    validator,
    response,
    data = Expand<ResolveValidatorOutput<validator>>
  > = [data] extends [object]
    ? AllKeysRequired<data> extends true
      ? RequiredInputFn<Input<data>, response>
      : OptionalInputFn<Input<data>, response>
    : RequiredInputFn<Input<data>, response>;
  export type WithoutInput<response> = () => response;
}

export type StepSpecificHelperFn<
  value extends steps.instantiateSteps,
  stepNumbers extends steps.StepNumbers<value>,
  targetStep extends stepNumbers
> = {
  /**
   * Create a helper function with validated input.
   */
  <validator, additionalCtx extends Record<string, unknown>, response>(
    options: Omit<
      HelperFnOptions.WithValidator<
        value,
        stepNumbers,
        [targetStep],
        validator,
        additionalCtx
      >,
      'stepData'
    >,
    fn: HelperFnInput.WithValidator<
      value,
      stepNumbers,
      [targetStep],
      validator,
      additionalCtx,
      response
    >
  ): HelperFnOutput.WithValidator<validator, response>;
  /**
   * Create a helper function without input.
   */
  <additionalCtx extends Record<string, unknown>, response>(
    fn: HelperFnInput.WithoutValidator<
      value,
      stepNumbers,
      [targetStep],
      additionalCtx,
      response
    >
  ): HelperFnOutput.WithoutInput<response>;
  /**
   * Create a helper function without input.
   */
  <response>(
    fn: HelperFnInput.WithoutValidator<
      value,
      stepNumbers,
      [targetStep],
      {},
      response
    >
  ): HelperFnOutput.WithoutInput<response>;
};

export type GeneralHelperFn<
  value extends steps.instantiateSteps,
  stepNumbers extends steps.StepNumbers<value>
> = {
  /**
   * Create a helper function with validated input.
   */
  <
    const chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    validator,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: HelperFnOptions.WithValidator<
      value,
      stepNumbers,
      chosenSteps,
      validator,
      additionalCtx
    >,
    fn: HelperFnInput.WithValidator<
      value,
      stepNumbers,
      chosenSteps,
      validator,
      additionalCtx,
      response
    >
  ): HelperFnOutput.WithValidator<validator, response>;
  /**
   * Create a helper function without input.
   */
  <
    const chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>,
    additionalCtx extends Record<string, unknown>,
    response
  >(
    options: HelperFnOptions.WithoutValidator<
      value,
      stepNumbers,
      chosenSteps,
      additionalCtx
    >,
    fn: HelperFnInput.WithoutValidator<
      value,
      stepNumbers,
      chosenSteps,
      additionalCtx,
      response
    >
  ): HelperFnOutput.WithoutInput<response>;
};
