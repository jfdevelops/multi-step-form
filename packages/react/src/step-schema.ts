import {
  type CasingType,
  type Constrain,
  createCtx,
  type CreateHelperFunctionOptionsBase,
  createStep,
  type DefaultCasing,
  type HelperFnChosenSteps,
  type HelperFnCtx,
  type HelperFnInputBase,
  type MultiStepFormSchemaStepConfig as MultiStepFormSchemaStepBaseConfig,
  MultiStepFormStepSchema as MultiStepFormStepSchemaBase,
  type ResolvedStep as ResolvedCoreStep,
  type Step,
  type StepNumbers,
  type StrippedResolvedStep,
  type ValidStepKey,
} from '@multi-step-form/core';
import type { ComponentPropsWithRef, ReactNode } from 'react';
import { MultiStepFormSchemaConfig } from './form-config';

export interface MultiStepFormSchemaStepConfig<
  TStep extends Step<TCasing>,
  TCasing extends CasingType,
  TFormAlias extends string,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
  TFormProps extends object,
  TResolvedStep extends ResolvedStep<TStep, TCasing> = ResolvedStep<
    TStep,
    TCasing
  >
> extends MultiStepFormSchemaStepBaseConfig<TStep, TCasing>,
    MultiStepFormSchemaConfig.Form<
      TResolvedStep,
      TFormAlias,
      TFormEnabledFor,
      TFormProps
    > {}

export type CreateFunction<TArgs extends any[], TReturn = void> = (
  ...args: TArgs
) => TReturn;
export type CreateComponent<TInput, TProps> = CreateFunction<
  [input: TInput, props: TProps],
  ReactNode
>;

export type CreateComponentCallback<
  TResolvedStep extends StrippedResolvedStep<AnyResolvedStep>,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TProps
> = CreateComponent<
  HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps>,
  TProps
>;
export type CreatedMultiStepFormComponent<TProps> = TProps extends undefined
  ? () => ReactNode
  : (props: TProps) => ReactNode;
export type CreateComponentFn<
  TResolvedStep extends AnyResolvedStep,
  // This is needed to make TS happy with all types
  TStepNumbers extends StepNumbers<TResolvedStep>
> = <
  chosenSteps extends HelperFnChosenSteps<TResolvedStep, TStepNumbers>,
  props = undefined
>(
  options: CreateHelperFunctionOptionsBase<
    TResolvedStep,
    TStepNumbers,
    chosenSteps
  >,
  fn: CreateComponentCallback<TResolvedStep, TStepNumbers, chosenSteps, props>
) => CreatedMultiStepFormComponent<props>;

export type CreateStepSpecificComponentCallback<
  TResolvedStep extends StrippedResolvedStep<AnyResolvedStep>,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TProps,
  TFormAlias extends string,
  TFormProps extends object,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>
> = CreateComponent<
  HelperFnInputBase<TResolvedStep, TSteps, TChosenSteps> &
    // The logic for getting the formCtx only works for step specific `createComponent`
    // (i.e: step1.createComponent(...)) as of now. Reason is because I can't think of a good API for integrating the form
    // ctx into the main `createComponent` since multiple steps can be chosen. In that case
    // how would the logic work for when the form component should be defined in the callback?
    // Ideas:
    //  - Make the main `createComponent` return a function that accepts the current step
    (TFormEnabledFor extends MultiStepFormSchemaConfig.defaultEnabledFor
      ? MultiStepFormSchemaConfig.formCtx<TFormAlias, TFormProps>
      : TFormEnabledFor extends HelperFnChosenSteps.tupleNotation<
          ValidStepKey<TSteps>
        >
      ? TFormEnabledFor[number] extends keyof TResolvedStep
        ? TChosenSteps extends HelperFnChosenSteps.tupleNotation<
            ValidStepKey<TSteps>
          >
          ? TChosenSteps[number] extends keyof TResolvedStep
            ? TChosenSteps[number] extends TFormEnabledFor[number]
              ? MultiStepFormSchemaConfig.formCtx<TFormAlias, TFormProps>
              : {}
            : {}
          : {}
        : {}
      : keyof TFormEnabledFor extends keyof TResolvedStep
      ? TChosenSteps extends HelperFnChosenSteps.tupleNotation<
          ValidStepKey<TSteps>
        >
        ? TChosenSteps[number] extends keyof TResolvedStep
          ? TChosenSteps[number] extends keyof TFormEnabledFor
            ? MultiStepFormSchemaConfig.formCtx<TFormAlias, TFormProps>
            : {}
          : {}
        : {}
      : {}),
  TProps
>;
export interface StepSpecificCreateComponentFn<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TTargetStep extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TFormAlias extends string,
  TFormProps extends object,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>
> {
  /**
   * A utility function to easily create a component for the current step.
   * @param fn The callback function where the component is defined.
   */
  <props = undefined>(
    fn: CreateStepSpecificComponentCallback<
      TResolvedStep,
      TSteps,
      TTargetStep,
      props,
      TFormAlias,
      TFormProps,
      TFormEnabledFor
    >
  ): CreatedMultiStepFormComponent<props>;
}

export type ResolvedStep<
  TStep extends Step<TDefaultCasing>,
  TDefaultCasing extends CasingType = DefaultCasing,
  TResolvedStep extends ResolvedCoreStep<
    TStep,
    TDefaultCasing
  > = ResolvedCoreStep<TStep, TDefaultCasing>,
  TFormAlias extends string = MultiStepFormSchemaConfig.defaultFormAlias,
  TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep> = MultiStepFormSchemaConfig.defaultEnabledFor,
  TFormProps extends object = ComponentPropsWithRef<'form'>
> = {
  [stepKey in keyof TResolvedStep]: TResolvedStep[stepKey] &
    (stepKey extends ValidStepKey<StepNumbers<TResolvedStep>>
      ? {
          createComponent: StepSpecificCreateComponentFn<
            TResolvedStep,
            StepNumbers<TResolvedStep>,
            [stepKey],
            TFormAlias,
            TFormProps,
            TFormEnabledFor
          >;
        }
      : {});
};

export type AnyResolvedStep = ResolvedStep<any, any, any>;
export interface HelperFunctions<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>
> {
  createComponent: CreateComponentFn<TResolvedStep, TStepNumbers>;
}
namespace CreateComponentImplConfig {
  export type stepSpecificConfig<
    TResolvedStep extends AnyResolvedStep,
    TFormAlias extends string,
    TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
    TFormProps extends object
  > = {
    isStepSpecific: true;
    defaultId: string;
    form?: MultiStepFormSchemaConfig.FormConfig<
      TResolvedStep,
      TFormAlias,
      TFormEnabledFor,
      TFormProps
    >;
  };

  export type nonStepSpecific = {
    isStepSpecific: false;
  };

  export type config<
    TResolvedStep extends AnyResolvedStep,
    TFormAlias extends string,
    TFormEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<TResolvedStep>,
    TFormProps extends object
  > =
    | nonStepSpecific
    | stepSpecificConfig<
        TResolvedStep,
        TFormAlias,
        TFormEnabledFor,
        TFormProps
      >;
}

export class MultiStepFormStepSchema<
    step extends Step<casing>,
    casing extends CasingType = DefaultCasing,
    formAlias extends string = MultiStepFormSchemaConfig.defaultFormAlias,
    formEnabledFor extends MultiStepFormSchemaConfig.formEnabledFor<resolvedStep> = MultiStepFormSchemaConfig.defaultEnabledFor,
    formProps extends object = ComponentPropsWithRef<'form'>,
    core extends ResolvedCoreStep<step, casing> = ResolvedCoreStep<
      step,
      casing
    >,
    resolvedStep extends ResolvedStep<
      step,
      casing,
      core,
      formAlias,
      formEnabledFor,
      formProps
    > = ResolvedStep<step, casing, core, formAlias, formEnabledFor, formProps>,
    stepNumbers extends StepNumbers<resolvedStep> = StepNumbers<resolvedStep>
  >
  extends MultiStepFormStepSchemaBase<step, casing>
  implements HelperFunctions<resolvedStep, stepNumbers>
{
  // @ts-ignore type doesn't match `MultiStepFormSchemaBase.value`
  value: resolvedStep;

  constructor(
    config: MultiStepFormSchemaStepConfig<
      step,
      Constrain<casing, CasingType>,
      formAlias,
      formEnabledFor,
      formProps
    >
  ) {
    const { form, ...rest } = config;

    super(rest);

    this.value = this.enrichValues(createStep(this.original));
    this.value = this.enrichValues(this.value, (step) => {
      const key = `step${step as stepNumbers}`;
      const id = form?.id ?? key;

      return {
        createComponent: this.createComponentForStep(
          [`step${step as stepNumbers}`],
          {
            isStepSpecific: true,
            defaultId: id,
            form: form as never,
          }
        ),
      };
    });
  }

  private createFormComponent(
    form: Omit<
      MultiStepFormSchemaConfig.FormConfig<
        resolvedStep,
        formAlias,
        formEnabledFor,
        formProps
      >,
      'alias'
    >,
    defaultId: string
  ) {
    const { render, enabledForSteps = 'all', id = defaultId } = form;

    const ctx = {
      id,
      steps: createCtx(this.value, enabledForSteps as never),
    };

    return (props: formProps) => render(ctx, props);
  }

  private createComponentImpl<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.nonStepSpecific
  ): <props>(
    fn: CreateComponentCallback<resolvedStep, stepNumbers, chosenStep, props>
  ) => CreatedMultiStepFormComponent<props>;
  private createComponentImpl<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.stepSpecificConfig<
      resolvedStep,
      formAlias,
      formEnabledFor,
      formProps
    >
  ): <props>(
    fn: CreateStepSpecificComponentCallback<
      resolvedStep,
      stepNumbers,
      chosenStep,
      props,
      formAlias,
      formProps,
      formEnabledFor
    >
  ) => CreatedMultiStepFormComponent<props>;
  private createComponentImpl<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.config<
      resolvedStep,
      formAlias,
      formEnabledFor,
      formProps
    >
  ) {
    const ctx = createCtx<resolvedStep, stepNumbers, chosenStep>(
      this.value,
      stepData
    );

    return <props>(fn: Function) => {
      return ((props?: props) => {
        if (config.isStepSpecific) {
          const { defaultId, form } = config;

          if (form) {
            const {
              alias = MultiStepFormSchemaConfig.DEFAULT_FORM_ALIAS,
              ...rest
            } = form;
            const enabledFor = rest.enabledForSteps ?? 'all';

            let input = { ctx };

            if (
              MultiStepFormSchemaConfig.isFormAvailable(
                stepData as never,
                enabledFor as never
              )
            ) {
              input = {
                ...input,
                [alias]: this.createFormComponent(rest, defaultId),
              };
            }

            return fn(input, props);
          }

          return fn(
            {
              ctx,
              [MultiStepFormSchemaConfig.DEFAULT_FORM_ALIAS]:
                MultiStepFormSchemaConfig.createDefaultForm(defaultId),
            },
            props
          );
        }

        return fn({ ctx } as any, props as any);
      }) as CreatedMultiStepFormComponent<props>;
    };
  }

  private createComponentForStep<
    chosenStep extends HelperFnChosenSteps<resolvedStep, stepNumbers>
  >(
    stepData: chosenStep,
    config: CreateComponentImplConfig.stepSpecificConfig<
      resolvedStep,
      formAlias,
      formEnabledFor,
      formProps
    >
  ) {
    return this.createComponentImpl(stepData, config);
  }

  /**
   * A helper function to create a component for a specific step.
   * @param options The options for creating the step specific component.
   * @param fn A callback that is used for accessing the target step's data and defining
   * any props that the component should have. This function must return a valid `JSX` element.
   * @returns The created component for the step.
   */
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
  ) {
    return this.createComponentImpl(options.stepData, {
      isStepSpecific: false,
    })<props>(fn);
  }
}
