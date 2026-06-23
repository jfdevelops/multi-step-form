import {
  createInvariant,
  Expand,
  HelperFnChosenSteps,
  type Invariant,
  type StepNumbers,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import {
  type ComponentPropsWithRef,
  type ComponentType,
  type FunctionComponent,
} from 'react';
import type { CreatedMultiStepFormComponent } from './utils';
import type { instantiateReactSteps } from './steps';

export namespace MultiStepFormSchemaConfig {
  export const DEFAULT_FORM_ALIAS = 'Form';
  export type defaultEnabledFor = HelperFnChosenSteps.defaultStringOption;
  export type defaultFormAlias = typeof DEFAULT_FORM_ALIAS;
  export type formEnabledFor<value extends instantiateReactSteps> =
    HelperFnChosenSteps.main<value, StepNumbers<value>>;
  type strippedResolvedSteps<value extends instantiateReactSteps> = {
    [_ in keyof value]: Expand<
      Omit<value[_], 'createComponent' | 'createHelperFn'>
    >;
  };
  export type inferFormAlias<def> = def extends {
    alias: infer alias extends string;
  }
    ? alias
    : defaultFormAlias;
  export type inferFormProps<def> = def extends {
    render: infer render;
  }
    ? render extends (data: any) => ComponentType<infer props>
      ? props
      : never
    : never;
  export namespace EnabledForSteps {
    export type get<def> = def extends {
      enabledForSteps: infer enabledForSteps;
    }
      ? enabledForSteps // Case: `enabledForSteps` isn't provided (default behavior)
      : def extends { form: infer form }
      ? form extends { enabledForSteps: infer enabledForSteps }
        ? enabledForSteps // Case: `enabledForSteps` is provided in the form config
        : never
      : never;
    export type resolveType<
      def extends StepSchema.Config,
      steps extends instantiateReactSteps<def>,
      value = instantiateFormConfig<def>
    > = get<value> extends defaultEnabledFor
      ? 'all'
      : get<value> extends HelperFnChosenSteps.tupleNotation<StepNumbers<steps>>
      ? 'tuple'
      : get<value> extends HelperFnChosenSteps.objectNotation<
          StepNumbers<steps>
        >
      ? 'object'
      : never;
  }

  export type inferFormEnabledForSteps<def> = def extends {
    // TODO decide if `enabledForSteps` validation is needed
    enabledForSteps: infer enabledForSteps;
  }
    ? enabledForSteps
    : defaultEnabledFor;
  export type inferComponent<def> = def extends { render: infer render }
    ? render extends (data: any) => infer r
      ? r extends ComponentType<infer _>
        ? r
        : never
      : never
    : never;
  export type inferredFormComponent<def> = {
    [key in inferFormAlias<def>]: inferComponent<def>;
  };

  export type instantiateFormConfig<def> = [def] extends [object]
    ? def extends { form: infer form }
      ? [form] extends [never]
        ? never
        : keyof FormConfig.withoutRender<form> extends never
        ? Expand<
            {
              alias: inferFormAlias<form>;
              enabledForSteps: inferFormEnabledForSteps<form>;
            } & inferredFormComponent<form>
          >
        : {
            -readonly [key in keyof FormConfig.withoutRender<form>]: Expand<
              {
                alias: inferFormAlias<FormConfig.withoutRender<form>>;
                enabledForSteps: inferFormEnabledForSteps<
                  FormConfig.withoutRender<form>
                >;
              } & inferredFormComponent<form>
            >;
          }[keyof FormConfig.withoutRender<form>]
      : {}
    : {};
  export type getEnabledForSteps<def> = instantiateFormConfig<def> extends {
    enabledForSteps: infer enabledForSteps;
  }
    ? enabledForSteps
    : def;
  export type AvailableStepForForm<
    value extends instantiateReactSteps,
    enabledFor extends formEnabledFor<value>
  > = enabledFor extends defaultEnabledFor
    ? strippedResolvedSteps<value>
    : enabledFor extends HelperFnChosenSteps.tupleNotation<StepNumbers<value>>
    ? enabledFor[number] extends keyof value
      ? Pick<strippedResolvedSteps<value>, enabledFor[number]>
      : never
    : keyof enabledFor extends keyof value
    ? Expand<
        Pick<
          strippedResolvedSteps<value>,
          Extract<keyof value, keyof enabledFor>
        >
      >
    : never;
  export type formCtx<alias extends string, props> = {
    [_ in alias]: CreatedMultiStepFormComponent<props>;
  };
  export type renderFnData<
    value extends instantiateReactSteps,
    enabledFor extends formEnabledFor<value>
  > = {
    /**
     * The id for the form, either a custom one or the default one.
     */
    id: string;
    /**
     * The chosen steps that are available.
     */
    steps: Expand<AvailableStepForForm<value, enabledFor>>;
  };

  export namespace FormConfig {
    export type withoutRender<def> = Omit<def, 'render'>;
  }

  /**
   * The configuration options for the `form` option.
   */
  export interface FormConfig<
    def extends StepSchema.Config = StepSchema.Config,
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>
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
    alias?: string;
    /**
     * If the form component should be accessible for each step when calling `createComponent`.
     *
     * If no value is given, the form will be accessible for all the
     */
    enabledForSteps?: HelperFnChosenSteps.main<value, StepNumbers<value>>;
    /**
     *
     * @param data The data that is available for creating the custom form.
     * @param props Props that can be used for the custom form.
     * @returns A React component that is the custom form.
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
    // render: (
    //   data: renderFnData<value, {[key in keyof def['steps']]: {}}>,
    //   props: def['formProps']
    // ) => JSX.Element;
    render: (data: value) => FunctionComponent<any>;
  }

  export function instantiateFormConfig<
    const def extends StepSchema.Config,
    value extends instantiateReactSteps<def>
  >(data: value, availableSteps: readonly StepNumbers<value>[]) {
    return <
      const form extends FormConfig<def, value>,
      inst = instantiateFormConfig<form>
    >(
      config: form | undefined
    ) => {
      const defaults = {
        alias: DEFAULT_FORM_ALIAS,
        enabledForSteps: 'all',
        props: undefined,
      };

      if (!config) {
        return defaults as inst;
      }

      const {
        alias = defaults.alias,
        enabledForSteps = defaults.enabledForSteps,
        render,
        id,
      } = config;
      const invariant: Invariant = createInvariant('[instantiateFormConfig]');

      if (id) {
        invariant(typeof id === 'string', 'The id must be a string');
      }

      if (alias) {
        invariant(typeof alias === 'string', 'The alias must be a string');
      }

      // TODO validate enabledForSteps
      if (enabledForSteps) {
        const availableStepsArray = Array.from(availableSteps);

        invariant(
          HelperFnChosenSteps.isValid(enabledForSteps, availableStepsArray),
          HelperFnChosenSteps.createCatchAllMessage(
            availableStepsArray,
            'enabledFor'
          )
        );
      }

      invariant(typeof render === 'function', 'The render must be a function');

      return {
        alias,
        enabledForSteps,
        [alias]: render(data),
      } as inst;
    };
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
    value extends instantiateReactSteps,
    target extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    enabledFor extends formEnabledFor<value>
  >(target: target, enabledFor: enabledFor) {
    if (Array.isArray(target)) {
      const match = HelperFnChosenSteps.match({
        meta: {
          target,
        },
        default: () => false,
        all: () => true,
        tuple: ({ chosenSteps, meta }) => {
          return chosenSteps.some((key) => meta.target.includes(key));
        },
        object: ({ chosenSteps, meta }) => {
          return Object.keys(chosenSteps).some((key) =>
            meta.target.includes(key as StepNumbers<value>)
          );
        },
      });

      return match<value, enabledFor>(enabledFor);
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
