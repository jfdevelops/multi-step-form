import type {
  DeepKeys,
  DeepPartial,
  Expand,
  objectHelpers,
  stripFunctions,
  Updater,
} from '@/utils/types';
import type { steps } from '../steps';
import type { HelperFn, HelperFnChosenSteps } from './helper-fn';
import type { path } from '@/utils/path';
import type { Relaxed } from '../types';

export namespace UpdateFn {
  export type chosenFields<TCurrentStep extends steps.Any> =
    | HelperFnChosenSteps.defaultStringOption
    | HelperFnChosenSteps.tupleNotation<DeepKeys<TCurrentStep>>
    | path.generateObjectConfig<TCurrentStep>;

  type resolveAllPropertyPath<
    TCurrentStep extends steps.Any,
    TField extends chosenFields<TCurrentStep>
  > = TField extends HelperFnChosenSteps.defaultStringOption
    ? Relaxed<TCurrentStep>
    : never;
  type resolveTuplePropertyPath<
    TCurrentStep extends steps.Any,
    TField extends chosenFields<TCurrentStep>,
    TDeepKeys extends DeepKeys<TCurrentStep> = DeepKeys<TCurrentStep>
  > = TField extends HelperFnChosenSteps.tupleNotation<TDeepKeys>
    ? TField[number] extends DeepKeys<Relaxed<TCurrentStep>>
      ? path.pickBy<Relaxed<TCurrentStep>, TField[number]>
      : never
    : never;
  type resolveObjectPropertyPath<
    TCurrentStep extends steps.Any,
    TField extends chosenFields<TCurrentStep>,
    TDeepKeys extends DeepKeys<TCurrentStep> = DeepKeys<TCurrentStep>
  > = TField extends path.generateObjectConfig<TField>
    ? path.objectToPath<TField> extends TDeepKeys
      ? path.objectToPath<TField> extends DeepKeys<Relaxed<TCurrentStep>>
        ? path.pickBy<Relaxed<TCurrentStep>, path.objectToPath<TField>>
        : never
      : never
    : never;
  type resolvePathType<
    TCurrentStep extends steps.Any,
    TField extends chosenFields<TCurrentStep>
  > = TField extends HelperFnChosenSteps.defaultStringOption
    ? 'all'
    : TField extends Array<infer _>
    ? 'tuple'
    : objectHelpers.isObject<TField> extends true
    ? 'object'
    : never;
  type resolvePathMap<
    TCurrentStep extends steps.Any,
    TField extends chosenFields<TCurrentStep>
  > = {
    all: resolveAllPropertyPath<TCurrentStep, TField>;
    tuple: resolveTuplePropertyPath<TCurrentStep, TField>;
    object: resolveObjectPropertyPath<TCurrentStep, TField>;
  };
  export type resolvedStep<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers
  > = stripFunctions<value[targetStep]>;
  export type resolvedFieldValue<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers,
    field extends chosenFields<currentStep>,
    currentStep extends resolvedStep<
      value,
      stepNumbers,
      targetStep
    > = resolvedStep<value, stepNumbers, targetStep>,
    pathType extends resolvePathType<currentStep, field> = resolvePathType<
      currentStep,
      field
    >
  > = resolvePathMap<currentStep, field>[pathType];

  export type mode = {
    /**
     * Enables strict mode for the update operation.
     *
     * When enabled, you won't be able to add new keys to an object. If
     * you need to add new keys, set to `false`.
     * @default true
     */
    strict: boolean;
    /**
     * Enables partial mode for the update operation.
     *
     * When enabled, you will be required to return the whole object. If
     * you need to return a partial object, set to `false`.
     * @default false
     */
    partial: boolean;
  };
  export type defaultMode = {
    strict: true;
    partial: false;
  };
  export type additionalUpdaterData =
    | Record<string, unknown>
    | (() => Record<string, unknown>);
  export type inferAdditionalUpdaterData<T extends additionalUpdaterData> =
    T extends () => infer _ ? _ : T;
  export type resolvedUpdaterReturnType<
    T,
    TMode extends mode,
    TAdditionalCtx extends additionalUpdaterData
  > = TMode['strict'] extends true
    ? TMode['partial'] extends true
      ? DeepPartial<T>
      : T
    : TMode['partial'] extends true
    ? DeepPartial<T> & TAdditionalCtx
    : T & TAdditionalCtx;
  export interface DebugOptions {
    /**
     * Enables verbose debug logging for this update operation.
     * Set to `true` to output helpful information for troubleshooting.
     */
    debug?: boolean;
    /**
     * Controls whether console errors should be silenced.
     *
     * By default, errors will be silenced when `partial: true` OR `strict: false`.
     *
     */
    silentErrors?: boolean;
  }
  export interface BaseOptions<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers,
    fields extends chosenFields<currentStep>,
    currentStep extends resolvedStep<
      value,
      stepNumbers,
      targetStep
    > = resolvedStep<value, stepNumbers, targetStep>
  > extends DebugOptions {
    /**
     * The step to update.
     */
    targetStep: targetStep;
    /**
     * The specific fields to update.
     *
     * Optionally provide a value to narrow the results of the `ctx` in the
     * updater `fn`.
     */
    fields?: fields;
  }

  export interface ModeOptions<TMode extends mode> {
    /**
     * Enables verbose debug logging for this update operation.
     * Set to `true` to output helpful information for troubleshooting.
     */
    debug?: boolean;
    /**
     * Controls whether console errors should be silenced.
     *
     * By default, errors will be silenced when `partial: true` OR `strict: false`.
     *
     */
    silentErrors?: boolean;
    /**
     * Enables strict mode for the update operation.
     *
     * When enabled, you won't be able to add new keys to an object. If
     * you need to add new keys, set to `false`.
     * @default true
     */
    strict?: TMode['strict'];
    /**
     * Enables partial mode for the update operation.
     *
     * When enabled, you will be required to return the whole object. If
     * you need to return a partial object, set to `false`.
     * @default false
     */
    partial?: TMode['partial'];
  }

  export interface SharedOptions<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers,
    fields extends chosenFields<currentStep>,
    updateMode extends mode,
    currentStep extends resolvedStep<
      value,
      stepNumbers,
      targetStep
    > = resolvedStep<value, stepNumbers, targetStep>
  > extends BaseOptions<value, stepNumbers, targetStep, fields, currentStep>,
      ModeOptions<updateMode> {}

  export type options<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers,
    field extends chosenFields<TCurrentStep>,
    strict extends boolean,
    partial extends boolean,
    additionalCtx extends Record<string, unknown>,
    updaterData extends additionalUpdaterData,
    TCurrentStep extends resolvedStep<
      value,
      stepNumbers,
      targetStep
    > = resolvedStep<value, stepNumbers, targetStep>,
    TMode extends mode = {
      strict: strict;
      partial: partial;
    }
  > = SharedOptions<
    value,
    stepNumbers,
    targetStep,
    field,
    TMode,
    TCurrentStep
  > &
    HelperFn.CtxDataSelector<
      value,
      stepNumbers,
      [targetStep],
      additionalCtx
    > & {
      updater: Updater<
        Expand<
          HelperFn.BaseInput<
            value,
            stepNumbers,
            [targetStep],
            never,
            additionalCtx
          >
        >,
        resolvedUpdaterReturnType<
          resolvedFieldValue<
            value,
            stepNumbers,
            targetStep,
            field,
            TCurrentStep
          >,
          TMode,
          updaterData
        >
      >;
    };
  export type availableFields<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers
  > = HelperFnChosenSteps.build<
    DeepKeys<resolvedStep<value, stepNumbers, targetStep>>
  >;

  export type general<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>
  > = <
    targetStep extends stepNumbers,
    field extends chosenFields<
      resolvedStep<value, stepNumbers, targetStep>
    > = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends Record<string, unknown> = {}
  >(
    options: options<
      value,
      stepNumbers,
      targetStep,
      field,
      strict,
      partial,
      additionalCtx,
      additionalUpdaterData
    >
  ) => void;

  export type stepSpecific<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers
  > = <
    field extends chosenFields<
      resolvedStep<value, stepNumbers, targetStep>
    > = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends Record<string, unknown> = {}
  >(
    options: Omit<
      options<
        value,
        stepNumbers,
        targetStep,
        field,
        strict,
        partial,
        additionalCtx,
        additionalUpdaterData
      >,
      'targetStep'
    >
  ) => void;
  export type StepSpecificHelperFn<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers
  > = {
    [key in targetStep]: stepSpecific<value, stepNumbers, key>;
  };
  export type createHelperFnForAllSteps<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = chosenSteps extends HelperFnChosenSteps.defaultStringOption
    ? StepSpecificHelperFn<value, stepNumbers, stepNumbers>
    : never;
  export type createHelperFnForTupleSteps<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = chosenSteps extends HelperFnChosenSteps.tupleNotation<stepNumbers>
    ? StepSpecificHelperFn<value, stepNumbers, chosenSteps[number]>
    : never;
  export type createHelperFnForObjectSteps<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = chosenSteps extends HelperFnChosenSteps.objectNotation<stepNumbers>
    ? {
        [key in keyof chosenSteps]: key extends stepNumbers
          ? StepSpecificHelperFn<value, stepNumbers, key>[key]
          : never;
      }
    : never;
  type HelperFnMap<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = {
    all: createHelperFnForAllSteps<value, stepNumbers, chosenSteps>;
    tuple: createHelperFnForTupleSteps<value, stepNumbers, chosenSteps>;
    object: createHelperFnForObjectSteps<value, stepNumbers, chosenSteps>;
  };
  export type HelperFn<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    chosenSteps extends HelperFnChosenSteps.main<value, stepNumbers>
  > = general<value, stepNumbers> &
    HelperFnMap<
      value,
      stepNumbers,
      chosenSteps
    >[HelperFnChosenSteps.resolveType<value, stepNumbers, chosenSteps>];
}
