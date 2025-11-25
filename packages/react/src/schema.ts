import {
  type CasingType,
  type Constrain,
  createCtx,
  type CreateHelperFunctionOptionsBase,
  DEFAULT_CASING,
  type DefaultCasing,
  type DefaultStorageKey,
  type HelperFnChosenSteps,
  type MultiStepFormSchemaOptions as MultiStepFormSchemaBaseOptions,
  MultiStepFormSchema as MultiStepFormSchemaCore,
  type ResolvedStep as ResolvedStepCore,
  type Step,
  type StepNumbers,
} from '@jfdevelops/multi-step-form';
import type { ComponentPropsWithRef } from 'react';
import { MultiStepFormSchemaConfig } from './form-config';
import {
  type CreateComponentCallback,
  type CreatedMultiStepFormComponent,
  type HelperFunctions,
  MultiStepFormStepSchema,
  type ResolvedStep,
} from './step-schema';
import { MultiStepFormStepSchemaInternal } from '@jfdevelops/multi-step-form/_internal';

// export type AnyMultiStepFormSchema = MultiStepFormSchema<any, any, any>;
export type AnyMultiStepFormSchema = { [x: string]: any };

// Helper inference types for `AnyMultiStepFormSchema`
export namespace MultiStepFormSchema {
  /**
   * Infer the resolved step from a {@linkcode MultiStepFormSchema}.
   */
  export type resolvedStep<T extends AnyMultiStepFormSchema> =
    T['stepSchema']['value'];
  /**
   * Infer the {@linkcode MultiStepFormSchema}'s step numbers.
   */
  export type stepNumbers<T extends AnyMultiStepFormSchema> = StepNumbers<
    resolvedStep<T>
  >;
  /**
   * Get the data for a specific step from a {@linkcode MultiStepFormSchema}.
   */
  export type getData<
    T extends AnyMultiStepFormSchema,
    TTarget extends keyof resolvedStep<T>
  > = resolvedStep<T>[TTarget];
}

export interface MultiStepFormSchemaOptions<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TStorageKey extends string,
  TFormAlias extends string,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
  TFormProps extends object,
  TResolvedStep extends ResolvedStep<TStep, TCasing> = ResolvedStep<
    TStep,
    TCasing
  >
> extends MultiStepFormSchemaBaseOptions<TStep, TCasing, TStorageKey>,
    MultiStepFormSchemaConfig.Form<
      TResolvedStep,
      TFormAlias,
      TFormEnabledFor,
      TFormProps
    > {}

export class MultiStepFormSchema<
    step extends Step<casing>,
    casing extends CasingType = DefaultCasing,
    storageKey extends string = DefaultStorageKey,
    formAlias extends string = MultiStepFormSchemaConfig.defaultFormAlias,
    formEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<resolvedStep> = MultiStepFormSchemaConfig.defaultEnabledFor,
    formProps extends object = ComponentPropsWithRef<'form'>,
    resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<
      step,
      casing
    >,
    stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>
  >
  extends MultiStepFormSchemaCore<
    step,
    casing,
    ResolvedStepCore<step, casing>,
    StepNumbers<ResolvedStepCore<step, casing>>,
    storageKey
  >
  implements HelperFunctions<resolvedStep, stepNumbers>
{
  stepSchema: MultiStepFormStepSchema<
    step,
    casing,
    storageKey,
    formAlias,
    formEnabledFor,
    formProps
  >;
  readonly #internal: MultiStepFormStepSchemaInternal<
    resolvedStep,
    stepNumbers
  >;

  constructor(
    config: MultiStepFormSchemaOptions<
      step,
      Constrain<casing, CasingType>,
      storageKey,
      formAlias,
      formEnabledFor,
      formProps
    >
  ) {
    const { nameTransformCasing = DEFAULT_CASING, storage, ...rest } = config;

    super({
      nameTransformCasing,
      storage,
      ...rest,
    });

    this.stepSchema = new MultiStepFormStepSchema<
      step,
      casing,
      storageKey,
      formAlias,
      formEnabledFor,
      formProps
    >({
      nameTransformCasing,
      ...rest,
    });
    this.#internal = new MultiStepFormStepSchemaInternal<
      resolvedStep,
      stepNumbers
    >({
      getValue: () => this.stepSchema.value as never,
      setValue: (value) => {
        this.stepSchema.value = { ...value } as never;
        this.storage.add(value);
        this.notify();
      },
    });
  }

  createComponent<
    chosenSteps extends HelperFnChosenSteps<resolvedStep, stepNumbers>,
    props = undefined
  >(
    options: CreateHelperFunctionOptionsBase<
      resolvedStep,
      stepNumbers,
      chosenSteps
    >,
    fn: CreateComponentCallback<resolvedStep, stepNumbers, chosenSteps, props>
  ): CreatedMultiStepFormComponent<props> {
    const { stepData } = options;
    const ctx = createCtx<resolvedStep, stepNumbers, chosenSteps>(
      this.stepSchema.value as never,
      stepData
    ) as never;

    return ((props?: props) =>
      fn(
        {
          ctx,
          update: this.#internal.createHelperFnInputUpdate(stepData),
        },
        props as any
      )) as any;
  }
}

export function createMultiStepFormSchema<
  step extends Step<casing>,
  casing extends CasingType = DefaultCasing,
  storageKey extends string = DefaultStorageKey,
  formAlias extends string = MultiStepFormSchemaConfig.defaultFormAlias,
  formEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<resolvedStep> = MultiStepFormSchemaConfig.defaultEnabledFor,
  formProps extends object = ComponentPropsWithRef<'form'>,
  resolvedStep extends ResolvedStep<step, casing> = ResolvedStep<step, casing>,
  stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>
>(
  options: MultiStepFormSchemaOptions<
    step,
    Constrain<casing, CasingType>,
    storageKey,
    formAlias,
    formEnabledFor,
    formProps
  >
) {
  return new MultiStepFormSchema<
    step,
    casing,
    storageKey,
    formAlias,
    formEnabledFor,
    formProps,
    resolvedStep,
    stepNumbers
  >(options);
}
