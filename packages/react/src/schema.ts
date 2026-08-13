import {
  type BaseStorageConfig,
  DEFAULT_CASING,
  DEFAULT_STORAGE_KEY,
  type Expand,
  MultiStepFormSchema as MultiStepFormSchemaCore,
  MultiStepFormStorage,
} from '@jfdevelops/multi-step-form-core';
import type { StepSchema } from '@jfdevelops/multi-step-form-core/_internals';
import {
  createMultiStepFormContext,
  type MultiStepFormContextResult,
} from './create-context';
import { MultiStepFormSchemaConfig } from './form-config';
import {
  type CreateComponentFn,
  type HelperFunctions,
  MultiStepFormStepSchema,
} from './step-schema';
import type { instantiateReactSteps } from './steps';

// Helper inference types for `AnyMultiStepFormSchema`
export namespace MultiStepFormSchema {
  // Read the public value property directly because inferring the class's constrained
  // generic can widen exact step keys back to the generic StepConfig index signature.
  export type resolvedStep<T> = T extends {
    stepSchema: { value: infer value };
  }
    ? value
    : never;

  export type withFormDef<
    def extends StepSchema.Config,
    formConfig extends object,
  > = def & {
    readonly form: MultiStepFormSchemaConfig.formDefinition<formConfig>;
  };

  type resolvedStepFunctionKey =
    'createComponent' | 'createHelperFn' | 'reset' | 'update';
  type withoutResolvedStepFunctions<value extends instantiateReactSteps> = {
    [key in keyof value]: Expand<{
      [
        property in keyof value[key] as property extends resolvedStepFunctionKey
          ? never
          : property
      ]: value[key][property];
    }>;
  };

  type withFormValueCandidate<
    def extends StepSchema.Config,
    formConfig extends object,
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>,
  > = instantiateReactSteps<
    withFormDef<def, formConfig>,
    withoutResolvedStepFunctions<value>
  >;

  export type withFormValue<
    def extends StepSchema.Config,
    formConfig extends object,
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>,
  > =
    withFormValueCandidate<
      def,
      formConfig,
      value
    > extends instantiateReactSteps<withFormDef<def, formConfig>>
      ? withFormValueCandidate<def, formConfig, value>
      : instantiateReactSteps<withFormDef<def, formConfig>>;

  export type config<
    def extends StepSchema.Config,
    value extends instantiateReactSteps<def> = instantiateReactSteps<def>,
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
  value extends instantiateReactSteps<def> = instantiateReactSteps<def>,
>
  extends MultiStepFormSchemaCore<def>
  implements HelperFunctions<def, value>
{
  // @ts-expect-error `value` is not assignable to the constraint of `value` but it works because of the `instantiateSteps` type
  stepSchema: MultiStepFormStepSchema<def, value>;
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
   * const schema = defineMultiStepForm({
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
   *   render({ id, steps }, props: MyCustomProps) {
   *     return <form id={id} {...props}>{props.children}</form>;
   *   },
   * });
   * ```
   * @param config The form configuration.
   * @returns A new {@linkcode MultiStepFormSchema} with the form configuration.
   */
  withForm<
    const formConfig extends MultiStepFormSchemaConfig.FormConfig<
      def,
      value,
      never
    >,
  >(
    config: formConfig,
  ): MultiStepFormSchema<
    MultiStepFormSchema.withFormDef<def, formConfig>,
    MultiStepFormSchema.withFormValue<def, formConfig, value>
  > {
    const { key, store, throwWhenUndefined } = this.storageConfig;

    return new MultiStepFormSchema<
      MultiStepFormSchema.withFormDef<def, formConfig>,
      MultiStepFormSchema.withFormValue<def, formConfig, value>
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

  get createComponent(): CreateComponentFn<def, value> {
    return this.stepSchema.createComponent;
  }
}

/** A React multi-step form schema regardless of its concrete steps or configured features. */
export type AnyMultiStepFormSchema = {
  readonly stepSchema: {
    readonly value: object;
  };
};
