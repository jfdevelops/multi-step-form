import type {
  Expand,
  HelperFnChosenSteps,
  StepNumbers,
  ValidStepKey,
} from '@jfdevelops/multi-step-form-core';
import type { ComponentPropsWithRef, JSX } from 'react';
import type {
  AnyResolvedStep,
  CreatedMultiStepFormComponent,
} from './step-schema';

export namespace MultiStepFormSchemaConfig {
  export const DEFAULT_FORM_ALIAS = 'Form';
  export type defaultEnabledFor = HelperFnChosenSteps.defaultStringOption;
  export type defaultFormAlias = typeof DEFAULT_FORM_ALIAS;
  export type formEnabledFor<TResolvedStep extends AnyResolvedStep> =
    HelperFnChosenSteps<TResolvedStep, StepNumbers<TResolvedStep>>;
  type strippedResolvedSteps<T extends AnyResolvedStep> = {
    [_ in keyof T]: Expand<Omit<T[_], 'createComponent' | 'createHelperFn'>>;
  };
  export type AvailableStepForForm<
    TResolvedStep extends AnyResolvedStep,
    TEnabledFor extends formEnabledFor<TResolvedStep>
  > = TEnabledFor extends defaultEnabledFor
    ? strippedResolvedSteps<TResolvedStep>
    : TEnabledFor extends [
        ValidStepKey<StepNumbers<TResolvedStep>>,
        ...ValidStepKey<StepNumbers<TResolvedStep>>[]
      ]
    ? TEnabledFor[number] extends keyof TResolvedStep
      ? Pick<strippedResolvedSteps<TResolvedStep>, TEnabledFor[number]>
      : never
    : keyof TEnabledFor extends keyof TResolvedStep
    ? Expand<
        Pick<
          strippedResolvedSteps<TResolvedStep>,
          Extract<keyof TResolvedStep, keyof TEnabledFor>
        >
      >
    : never;
  export type formCtx<TAlias extends string, TProps> = {
    [_ in TAlias]: CreatedMultiStepFormComponent<TProps>;
  };
  export type renderFnData<
    TResolvedStep extends AnyResolvedStep,
    TEnabledFor extends formEnabledFor<TResolvedStep>
  > = {
    /**
     * The id for the form, either a custom one or the default one.
     */
    id: string;
    /**
     * The chosen steps that are available.
     */
    steps: Expand<AvailableStepForForm<TResolvedStep, TEnabledFor>>;
  };

  /**
   * The configuration options for the `form` option.
   */
  export interface FormConfig<
    TResolvedStep extends AnyResolvedStep,
    TAlias extends string,
    TFormEnabledFor extends formEnabledFor<TResolvedStep>,
    TCustomFormProps extends object
  > {
    /**
     * The `id` for the form component.
     *
     * If there is no value provided, the default id will the **current step key**.
     *
     * @default `${currentStep}`
     */
    id?: string;
    /**
     * The "name" of the form component.
     * @default 'Form'
     * @example
     * ```tsx
     * const schema = createMultiStepFormSchema({
     *  steps: {
     *    step1: {
     *      title: 'Step 1',
     *      fields: {
     *        firstName: {
     *          defaultValue: ''
     *       }
     *     }
     *   },
     *   form: {
     *    alias: 'MyCustomForm',
     *    render() {
     *      // return custom form component here
     *     }
     *   }
     *  }
     * })
     *
     * const Step1 = schema.stepSchema.step1.createComponent(
     *  ({ ctx, MyCustomForm }, props: { children: ReactNode }) =>
     *     // Notice how the form is available with its alias
     *     <MyCustomFormName>{children}</MyCustomFormName>
     *  )
     * ```
     */
    alias?: TAlias;
    /**
     * If the form component should be accessible for each step when calling `createComponent`.
     *
     * If no value is given, the form will be accessible for all the steps.
     */
    enabledForSteps?: TFormEnabledFor;
    /**
     *
     * @param data The data that is available for creating the custom form.
     * @param props Props that can be used for the custom form.
     * @returns An {@see JSX.Element} that is the custom form.
     * @example
     * ### With custom props
     * ```tsx
     * type CustomProps = {
     *   title: string;
     *   description?: string;
     *   children: ReactNode;
     * };
     *
     * const schema = createMultiStepFormSchema({
     *  steps: {
     *    step1: {
     *      title: 'Step 1',
     *      fields: {
     *        firstName: {
     *          defaultValue: ''
     *       }
     *     }
     *   },
     *   form: {
     *    alias: 'MyCustomForm',
     *    render(data, props: CustomProps) {
     *      return (
     *         <div>
     *          <h1>{props.title}</h1>
     *          <p>{props.description}</p>
     *          <form>{props.children}</form>
     *         </div>
     *       );
     *     }
     *   }
     *  }
     * })
     * ```
     * ### Without custom props
     * ```tsx
     * const schema = createMultiStepFormSchema({
     *  steps: {
     *    step1: {
     *      title: 'Step 1',
     *      fields: {
     *        firstName: {
     *          defaultValue: ''
     *       }
     *     }
     *   },
     *   form: {
     *    alias: 'MyCustomForm',
     *    render(data, props) {
     *      // The default type for `props` will be `ComponentPropsWithRef<'form'>`
     *      // return custom form component here
     *     }
     *   }
     *  }
     * })
     * ```
     */
    render: (
      data: renderFnData<TResolvedStep, TFormEnabledFor>,
      props: TCustomFormProps
    ) => JSX.Element;
  }

  export interface Form<
    TResolvedStep extends AnyResolvedStep,
    TAlias extends string,
    TFormEnabledFor extends formEnabledFor<TResolvedStep>,
    TCustomFormProps extends object
  > {
    form?: FormConfig<TResolvedStep, TAlias, TFormEnabledFor, TCustomFormProps>;
  }

  /**
   * Compares {@linkcode enabledFor} to the {@linkcode target} to determine if the form
   * should be available.
   * @param target The target steps the form _should_ be available for.
   * @param enabledFor The steps that the form _is_ enabled for.
   * @returns A boolean representing if the form should be available.
   */
  // Note: the implementation is specific to `MultiStepFormStepSchema.createComponentForStep`
  // because the `target` will always be an `Array` in `MultiStepFormStepSchema.createComponentForStep`.
  // TODO add validation to keys
  export function isFormAvailable<
    TResolvedStep extends AnyResolvedStep,
    TTarget extends HelperFnChosenSteps<
      TResolvedStep,
      StepNumbers<TResolvedStep>
    >,
    TEnabledFor extends formEnabledFor<TResolvedStep>
  >(target: TTarget, enabledFor: TEnabledFor) {
    if (Array.isArray(target)) {
      if (enabledFor === 'all') {
        return true;
      }

      if (typeof enabledFor === 'object' && !Array.isArray(enabledFor)) {
        return Object.keys(enabledFor).some((key) =>
          target.includes(key as `step${StepNumbers<TResolvedStep>}`)
        );
      }

      if (Array.isArray(enabledFor)) {
        return enabledFor.some((key) => target.includes(key));
      }
    }

    return false;
  }

  /**
   * Creates a form component with a default id.
   * @param id The default id for the form.
   * @returns A form component with a default {@linkcode id}.
   */
  export function createDefaultForm(id: string) {
    return (props: Omit<ComponentPropsWithRef<'form'>, 'id'>) => (
      <form id={id} {...props} />
    );
  }
}
