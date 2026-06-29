import {
  type BaseStorageConfig,
  DEFAULT_CASING,
  DEFAULT_STORAGE_KEY,
  type Expand,
  type HelperFn,
  type HelperFnChosenSteps,
  MultiStepFormSchema as MultiStepFormSchemaCore,
  MultiStepFormStorage,
  type StepNumbers,
} from '@jfdevelops/multi-step-form-core';
import {
  MultiStepFormStepSchemaInternal,
  type StepSchema,
} from '@jfdevelops/multi-step-form-core/_internals';
import {
  createMultiStepFormContext,
  type MultiStepFormContextResult,
} from './create-context';
import { MultiStepFormSchemaConfig } from './form-config';
import { type HelperFunctions, MultiStepFormStepSchema } from './step-schema';
import { createComponent, type CreateComponentCallback } from './utils';
import { type instantiateReactSteps } from './steps';

// Helper inference types for `AnyMultiStepFormSchema`
export namespace MultiStepFormSchema {
  export type resolvedStep<T> = T extends MultiStepFormSchema<infer _def, infer value>
    ? value
    : never;

  export type withFormDef<
    def extends StepSchema.Config,
    formConfig extends object
  > = Expand<def & Readonly<{ form: formConfig }>>;

  export type withFormValue<
    def extends StepSchema.Config,
    formConfig extends object
  > = instantiateReactSteps<withFormDef<def, formConfig>>;

  export type config<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>
  > = MultiStepFormStepSchema.config<def, value> & {
    /**
     * The React context for the multi step form.
     *
     * This is a private property and is not meant to be used directly.
     * @private
     * @internal
     */
    context?: MultiStepFormContextResult<def, value>;
  };
}

export class MultiStepFormSchema<
    const def extends StepSchema.Config,
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>
  >
  extends MultiStepFormSchemaCore<def>
  implements HelperFunctions<def, value>
{
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  stepSchema: MultiStepFormStepSchema<def, value>;
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  readonly #internal: MultiStepFormStepSchemaInternal<def, value>;
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  override readonly storage: MultiStepFormStorage<
    value,
    StepSchema.inferStorageKey<def>
  >;
  override readonly storageConfig: BaseStorageConfig<
    StepSchema.inferStorageKey<def>
  >;

  context: MultiStepFormContextResult<def, value> = undefined as never;
  readonly #formConfig: MultiStepFormSchemaConfig.FormConfig<def, value> =
    undefined as never;

  constructor(config: MultiStepFormSchema.config<def, value>) {
    const {
      nameTransformCasing = DEFAULT_CASING,
      steps,
      form,
      storage,
      context,
    } = config;
    const options = {
      steps,
      nameTransformCasing,
      storage,
      form,
    } as MultiStepFormStepSchema.config<def, value>;

    super(options);

    this.stepSchema = new MultiStepFormStepSchema(options);
    this.stepSchema.subscribe(() => {
      this.notify();
    });
    // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
    this.#internal = new MultiStepFormStepSchemaInternal<def, value>({
      originalValue: this.stepSchema.original,
      getValue: () => this.stepSchema.value,
      setValue: (value) => {
        this.stepSchema.value = { ...value };
        this.storage.add(value);
        this.notify();
      },
    });
    this.storageConfig = {
      key: (storage?.key ??
        DEFAULT_STORAGE_KEY) as StepSchema.inferStorageKey<def>,
      store: storage?.store,
      throwWhenUndefined: storage?.throwWhenUndefined,
    };
    this.storage = new MultiStepFormStorage({
      data: this.stepSchema.value,
      ...this.storageConfig,
    });
    if (context) {
      this.context = context;
    }

    if (form) {
      this.#formConfig = form;
    }
  }

  /**
   * A helper function to add a form configuration to the {@linkcode MultiStepFormSchema}.
   *
   * By calling this function, you will have access to the create form component in all step
   * utility functions.
   *
   * @example
   * ```tsx
   * const schema = createMultiStepFormSchema({
   *   steps: {
   *     step1: {
   *       title: 'Step 1',
   *       fields: {
   *         firstName: {
   *           defaultValue: '',
   *         },
   *       },
   *     },
   *   },
   * }).withForm({
   *   render(data) {
   *     return (props: MyCustomProps) => {
   *       return <form {...props}>{props.children}</form>;
   *     };
   *   },
   * });
   * ```
   * @param config The form configuration.
   * @returns A new {@linkcode MultiStepFormSchema} with the form configuration.
   */
  withForm<
    const formConfig extends object
  >(
    config: formConfig & MultiStepFormSchemaConfig.FormConfig<def, value>
  ): MultiStepFormSchema<
    MultiStepFormSchema.withFormDef<def, formConfig>,
    MultiStepFormSchema.withFormValue<def, formConfig>
  > {
    const { key, store, throwWhenUndefined } = this.storageConfig;

    return new MultiStepFormSchema<
      MultiStepFormSchema.withFormDef<def, formConfig>,
      MultiStepFormSchema.withFormValue<def, formConfig>
    >({
      steps: this.stepSchema.original,
      form: config,
      nameTransformCasing: this.stepSchema.defaultNameTransformationCasing,
      storage: {
        key,
        store,
        throwWhenUndefined: throwWhenUndefined,
      },
    } as never);
  }

  withContext() {
    const next = new MultiStepFormSchema<def, value>({
      steps: this.stepSchema.original,
      form: this.#formConfig,
      nameTransformCasing: this.stepSchema.defaultNameTransformationCasing,
      storage: {
        key: this.storageConfig.key,
        store: this.storageConfig.store,
        throwWhenUndefined: this.storageConfig.throwWhenUndefined,
      },
    } as never);

    next.context = createMultiStepFormContext(next as never);

    return next;
  }

  createComponent<
    chosenSteps extends HelperFnChosenSteps.main<value, StepNumbers<value>>,
    props = undefined
  >(
    options: HelperFn.BaseOptions<value, chosenSteps>,
    fn: CreateComponentCallback<value, chosenSteps, props>
  ) {
    return createComponent({
      fn,
      input: ({ stepData }) => ({
        reset: this.#internal.createHelperFnInputReset(stepData),
        update: this.#internal.createHelperFnInputUpdate(stepData),
      }),
      options,
      value: this.stepSchema.value,
    });
  }
}

export function createMultiStepFormSchema<const def extends StepSchema.Config>(
  options: def
) {
  return new MultiStepFormSchema<def>(options);
}
