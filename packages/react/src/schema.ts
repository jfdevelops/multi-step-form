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
import { createMultiStepFormContext } from './create-context';
import {
  createPlugin,
  type PluginInstance,
  type MergeDefExtensions,
  type MergeApis,
} from './plugin';

// Helper inference types for `AnyMultiStepFormSchema`
// export namespace MultiStepFormSchema {
//   /**
//    * Infer the resolved step from a {@linkcode MultiStepFormSchema}.
//    */
//   export type resolvedStep<T extends AnyMultiStepFormSchema> =
//     T['stepSchema']['value'];
//   /**
//    * Infer the {@linkcode MultiStepFormSchema}'s step numbers.
//    */
//   export type stepNumbers<T extends AnyMultiStepFormSchema> = StepNumbers<
//     resolvedStep<T>
//   >;
//   /**
//    * Get the data for a specific step from a {@linkcode MultiStepFormSchema}.
//    */
//   export type getData<
//     T extends AnyMultiStepFormSchema,
//     TTarget extends keyof resolvedStep<T>,
//   > = resolvedStep<T>[TTarget];
// }

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

  constructor(config: MultiStepFormStepSchema.config<def, value>) {
    const {
      nameTransformCasing = DEFAULT_CASING,
      steps,
      form,
      storage,
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
  }

  withPlugins<
    const TPlugins extends readonly PluginInstance<any, any, any, any, any>[],
    TNewDef extends StepSchema.Config = Expand<
      def & MergeDefExtensions<TPlugins>
    >,
  >(
    ...plugins: TPlugins
  ): MultiStepFormSchema<TNewDef, steps.instantiateSteps<TNewDef>> &
    MergeApis<TPlugins> {
    // Build the new constructor config with plugin configs
    const pluginConfigs: Record<string, unknown> = {};

    for (const plugin of plugins) {
      const constructorKey = plugin.definition.constructorKey ?? plugin.key;
      const config = plugin.config ?? plugin.definition.defaults;
      pluginConfigs[constructorKey] = config;
    }

    const { key, store, throwWhenUndefined } = this.storageConfig;

    // Create new schema instance with merged config
    const newSchema = new MultiStepFormSchema({
      steps: this.stepSchema.original,
      nameTransformCasing: this.stepSchema.defaultNameTransformationCasing,
      storage: {
        key,
        store,
        throwWhenUndefined,
      },
      ...pluginConfigs,
    } as never);

    // Collect and merge APIs
    let apis = {};

    for (const plugin of plugins) {
      if (plugin.definition.api) {
        // Get the instantiated config
        const constructorKey = plugin.definition.constructorKey ?? plugin.key;
        let instantiatedConfig = pluginConfigs[constructorKey];

        if (plugin.definition.instantiate) {
          const processor = plugin.definition.instantiate({
            value: newSchema.stepSchema.value,
            availableSteps: newSchema.stepSchema.steps.value,
            def: newSchema.stepSchema.original as never,
          });
          instantiatedConfig = processor(plugin.config);
        }

        const pluginApi = plugin.definition.api({
          schema: newSchema as never,
          config: instantiatedConfig,
        });

        Object.assign(apis, pluginApi);
      }
    }

    return Object.assign(newSchema, apis) as never;
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

    // return new instance
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


