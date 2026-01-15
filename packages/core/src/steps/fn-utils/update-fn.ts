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
    targetStep extends steps.StepNumbers<value>
  > = stripFunctions<value[targetStep]>;
  export type resolvedFieldValue<
    value extends steps.instantiateSteps,
    targetStep extends steps.StepNumbers<value>,
    field extends chosenFields<currentStep>,
    currentStep extends resolvedStep<value, targetStep> = resolvedStep<
      value,
      targetStep
    >,
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
    targetStep extends steps.StepNumbers<value>,
    fields extends chosenFields<currentStep>,
    currentStep extends resolvedStep<value, targetStep> = resolvedStep<
      value,
      targetStep
    >
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
    targetStep extends steps.StepNumbers<value>,
    fields extends chosenFields<currentStep>,
    updateMode extends mode,
    currentStep extends resolvedStep<value, targetStep> = resolvedStep<
      value,
      targetStep
    >
  > extends BaseOptions<value, targetStep, fields, currentStep>,
      ModeOptions<updateMode> {}

  export type options<
    value extends steps.instantiateSteps,
    targetStep extends steps.StepNumbers<value>,
    field extends chosenFields<TCurrentStep>,
    strict extends boolean,
    partial extends boolean,
    additionalCtx extends Record<string, unknown>,
    updaterData extends additionalUpdaterData,
    TCurrentStep extends resolvedStep<value, targetStep> = resolvedStep<
      value,
      targetStep
    >,
    TMode extends mode = {
      strict: strict;
      partial: partial;
    }
  > = SharedOptions<value, targetStep, field, TMode, TCurrentStep> &
    HelperFn.CtxDataSelector<value, [targetStep], additionalCtx> & {
      updater: Updater<
        Expand<HelperFn.BaseInput<value, [targetStep], never, additionalCtx>>,
        resolvedUpdaterReturnType<
          resolvedFieldValue<value, targetStep, field, TCurrentStep>,
          TMode,
          updaterData
        >
      >;
    };

  export type availableFields<
    value extends steps.instantiateSteps,
    stepNumbers extends steps.StepNumbers<value>,
    targetStep extends stepNumbers
  > = HelperFnChosenSteps.build<DeepKeys<resolvedStep<value, targetStep>>>;

  export type general<value extends steps.instantiateSteps> = <
    targetStep extends steps.StepNumbers<value>,
    field extends chosenFields<resolvedStep<value, targetStep>> = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends Record<string, unknown> = {}
  >(
    options: options<
      value,
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
    targetStep extends stepNumbers,
    stepNumbers extends steps.StepNumbers<value> = steps.StepNumbers<value>
  > = <
    field extends chosenFields<resolvedStep<value, targetStep>> = 'all',
    strict extends boolean = true,
    partial extends boolean = false,
    additionalCtx extends Record<string, unknown> = {},
    additionalUpdaterData extends Record<string, unknown> = {}
  >(
    options: Omit<
      options<
        value,
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
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  > = {
    [key in HelperFnChosenSteps.resolve<value, chosenSteps>]: stepSpecific<
      value,
      key
    >;
  };
  export type createHelperFnForAllSteps<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  > = chosenSteps extends HelperFnChosenSteps.defaultStringOption
    ? StepSpecificHelperFn<value, chosenSteps>
    : never;
  export type createHelperFnForTupleSteps<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  > = chosenSteps extends HelperFnChosenSteps.tupleNotation<
    steps.StepNumbers<value>
  >
    ? StepSpecificHelperFn<value, chosenSteps>
    : never;
  export type createHelperFnForObjectSteps<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  > = chosenSteps extends HelperFnChosenSteps.objectNotation<
    steps.StepNumbers<value>
  >
    ? {
        [key in keyof chosenSteps]: key extends HelperFnChosenSteps.resolve<
          value,
          chosenSteps
        >
          ? StepSpecificHelperFn<value, chosenSteps>[key]
          : never;
      }
    : never;
  type HelperFnMap<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  > = {
    all: createHelperFnForAllSteps<value, chosenSteps>;
    tuple: createHelperFnForTupleSteps<value, chosenSteps>;
    object: createHelperFnForObjectSteps<value, chosenSteps>;
  };
  export type HelperFn<
    value extends steps.instantiateSteps,
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >
  > = general<value> &
    HelperFnMap<value, chosenSteps>[HelperFnChosenSteps.resolveType<
      value,
      chosenSteps
    >];
}
