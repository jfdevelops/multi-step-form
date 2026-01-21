import {
  type BaseStorageConfig,
  DEFAULT_CASING,
  DEFAULT_STORAGE_KEY,
  type Expand,
  type HelperFn,
  type HelperFnChosenSteps,
  MultiStepFormSchema as MultiStepFormSchemaCore,
  MultiStepFormStorage,
  type steps,
} from '@jfdevelops/multi-step-form-core';
import {
  MultiStepFormStepSchemaInternal,
  type StepSchema,
} from '@jfdevelops/multi-step-form-core/_internals';
import { MultiStepFormSchemaConfig } from './form-config';
import { type HelperFunctions, MultiStepFormStepSchema } from './step-schema';
import { createComponent, type CreateComponentCallback } from './utils';
import {
  createMultiStepFormContext,
  type MultiStepFormContextResult,
} from './create-context';

// Helper inference types for `AnyMultiStepFormSchema`
export namespace MultiStepFormSchema {
  export type config<
    def extends StepSchema.Config,
    value extends steps.instantiateSteps<def> = steps.instantiateSteps<def>,
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
  value extends steps.instantiateSteps<def> = steps.instantiateSteps<def>,
>
  extends MultiStepFormSchemaCore<def, value>
  implements HelperFunctions<def, value>
{
  stepSchema: MultiStepFormStepSchema<def, value>;
  readonly #internal: MultiStepFormStepSchemaInternal<def, value>;
  override readonly storage: MultiStepFormStorage<
    value,
    StepSchema.inferStorageKey<def>
  >;
  override readonly storageConfig: BaseStorageConfig<
    StepSchema.inferStorageKey<def>
  >;

  readonly context: MultiStepFormContextResult<def, value> = undefined as never;
  readonly formConfig: MultiStepFormSchemaConfig.FormConfig<def, value> =
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
    this.#internal = new MultiStepFormStepSchemaInternal({
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
      this.formConfig = form;
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
    const formConfig extends MultiStepFormSchemaConfig.FormConfig<def, value>,
  >(config: formConfig) {
    const { key, store, throwWhenUndefined } = this.storageConfig;

    return new MultiStepFormSchema<
      Expand<def & Readonly<{ form: formConfig }>>
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
    const context = createMultiStepFormContext(this);

    const t = Object.assign(this, { context });

    // return new instance
    return new MultiStepFormSchema<def, value>({
      steps: this.stepSchema.original,
      form: this.formConfig,
      nameTransformCasing: this.stepSchema.defaultNameTransformationCasing,
      storage: {
        key: this.storageConfig.key,
        store: this.storageConfig.store,
        throwWhenUndefined: this.storageConfig.throwWhenUndefined,
      },
      context,
    } as never);
  }

  createComponent<
    chosenSteps extends HelperFnChosenSteps.main<
      value,
      steps.StepNumbers<value>
    >,
    props = undefined,
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

export function createMultiStepFormSchema<
  const def extends StepSchema.Config,
  value extends steps.instantiateSteps<def> = steps.instantiateSteps<def>,
>(options: def) {
  return new MultiStepFormSchema<def, value>(options);
}
