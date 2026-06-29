import type { instantiateSteps, StepNumbers } from '@/steps/steps';
import type { Constrain, Expand } from '@/utils';
import type {
  AnyValidator,
  DefaultValidator,
  ResolveValidatorOutput,
} from '@/utils/validator';
import type { ResetFn } from '../reset-fn';
import type { UpdateFn } from '../update-fn';
import type { HelperFn, HelperFnChosenSteps } from '.';

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
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    omitSteps extends HelperFnChosenSteps.resolve<value, chosenSteps> = never,
    TAdditionalCtx extends Record<string, unknown> = {}
  > extends HelperFn.BaseInput<value, chosenSteps, omitSteps, TAdditionalCtx> {
    /**
     * A function to update parts of the multi-step form schema.
     */
    update: UpdateFn.HelperFn<value, chosenSteps>;
    /**
     * A useful wrapper for `update` to reset a specific field's value to its
     * original config value.
     */
    reset: ResetFn.HelperFn<value, chosenSteps>;
  }
  export interface InputWithValidator<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    validator,
    additionalCtx extends Record<string, unknown> = {}
  > extends BaseInput<value, chosenSteps, never, additionalCtx> {
    /**
     * The validated data from the validator.
     */
    data: ResolveValidatorOutput<validator>;
  }

  export interface InputWithoutValidator<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    additionalCtx extends Record<string, unknown> = {}
  > extends BaseInput<value, chosenSteps, never, additionalCtx> {}

  export type WithValidator<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    validator,
    additionalCtx extends Record<string, unknown>,
    response
  > = RequiredInputFn<
    InputWithValidator<value, chosenSteps, validator, additionalCtx>,
    response
  >;

  export type WithoutValidator<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    additionalCtx extends Record<string, unknown>,
    response
  > = RequiredInputFn<
    InputWithoutValidator<value, chosenSteps, additionalCtx>,
    response
  >;
}

export namespace HelperFnOptions {
  export interface WithCustomCtx<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    additionalCtx extends Record<string, unknown>
  > extends HelperFn.BaseOptions<value, chosenSteps>,
      HelperFn.CtxDataSelector<value, chosenSteps, additionalCtx> {}
  export interface WithValidator<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    validator,
    additionalCtx extends Record<string, unknown>
  > extends WithCustomCtx<value, chosenSteps, additionalCtx> {
    /**
     * A validator used to validate the params.
     */
    validator: Constrain<validator, AnyValidator, DefaultValidator>;
  }
  export interface WithoutValidator<
    value extends instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    additionalCtx extends Record<string, unknown>
  > extends WithCustomCtx<value, chosenSteps, additionalCtx> {}
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
  value extends instantiateSteps,
  targetStep extends StepNumbers<value>
> = {
  /**
   * Create a helper function with validated input.
   */
  <validator, additionalCtx extends Record<string, unknown>, response>(
    options: Omit<
      HelperFnOptions.WithValidator<
        value,
        [targetStep],
        validator,
        additionalCtx
      >,
      'stepData'
    >,
    fn: HelperFnInput.WithValidator<
      value,
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
      [targetStep],
      additionalCtx,
      response
    >
  ): HelperFnOutput.WithoutInput<response>;
  /**
   * Create a helper function without input.
   */
  <response>(
    fn: HelperFnInput.WithoutValidator<value, [targetStep], {}, response>
  ): HelperFnOutput.WithoutInput<response>;
};

export type GeneralHelperFn<
  value extends instantiateSteps,
  stepNumbers extends StepNumbers<value> = StepNumbers<value>
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
      chosenSteps,
      validator,
      additionalCtx
    >,
    fn: HelperFnInput.WithValidator<
      value,
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
      chosenSteps,
      additionalCtx
    >,
    fn: HelperFnInput.WithoutValidator<
      value,
      chosenSteps,
      additionalCtx,
      response
    >
  ): HelperFnOutput.WithoutInput<response>;
};
