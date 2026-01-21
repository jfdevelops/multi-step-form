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
import { createMultiStepFormContext } from './create-context';
import { MultiStepFormSchemaConfig } from './form-config';
import {
  type AnyPlugin,
  createPlugin,
  type ReducePlugins,
  type StringifiedPluginType,
} from './plugin';
import { type HelperFunctions, MultiStepFormStepSchema } from './step-schema';
import { createComponent, type CreateComponentCallback } from './utils';

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

  withPlugins<const plugins extends Array<(schema: this) => AnyPlugin>>(
    ...plugins: plugins
  ) {
    // Build the new constructor config with plugin configs
    const {
      '[instance,instance.step-schema]': both,
      'instance.step-schema': stepSchema,
      augment,
      instance,
    } = Object.values(plugins).reduce(
      (acc, plugin) => {
        const { key, target: type, ...config } = plugin(this);

        if (type === 'augment') {
          acc.augment.push({ ...config, key });
        } else if (type === 'instance') {
          acc.instance.push({ ...config, key });
        } else if (type === 'instance.step-schema') {
          acc['instance.step-schema'].push({ ...config, key });
        } else {
          acc['[instance,instance.step-schema]'].push({ ...config, key });
        }

        return acc;
      },
      {
        augment: [],
        instance: [],
        'instance.step-schema': [],
        '[instance,instance.step-schema]': [],
      } as {
        [key in StringifiedPluginType]: Array<Omit<AnyPlugin, 'type'>>;
      }
    );
    const { key, store, throwWhenUndefined } = this.storageConfig;

    let newSchema = this;

    if (augment.length > 0) {
      const pluginConfigs = augment.reduce(
        (acc, plugin) => {
          const { key, ...rest } = plugin;

          acc[key] = rest;

          return acc;
        },
        {} as Record<string, unknown>
      );

      // Create new schema instance with merged config
      newSchema = new MultiStepFormSchema({
        steps: this.stepSchema.original,
        nameTransformCasing: this.stepSchema.defaultNameTransformationCasing,
        storage: {
          key,
          store,
          throwWhenUndefined,
        },
        ...pluginConfigs,
      } as never) as never;
    }

    return newSchema as unknown as MultiStepFormSchema<
      def & ReducePlugins<plugins>
    >;
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

const t = createMultiStepFormSchema({
  steps: {
    step1: {
      title: 'Step 1',
      fields: {
        firstName: {
          defaultValue: '',
        },
      },
    },
  },
}).withForm({
  render(data) {
    return () => {
      return '';
    };
  },
});

const formPlugin = createPlugin({
  key: 'form',
  target: ['step-schema'],
  addToDef: true,
  config: (
    { stepSchema },
    config: MultiStepFormSchemaConfig.FormConfig<
      { steps: typeof stepSchema.original },
      typeof stepSchema.value
    >
  ) => config,
  stepSchema: {
    valueEnrichment: {
      before: ({ config, schema }) => {
        const createFormConfig =
          MultiStepFormSchemaConfig.instantiateFormConfig(
            schema.stepSchema.value,
            schema.stepSchema.steps.value
          );

        return createFormConfig(config);
      },
      during: {
        createComponent: ({ beforeValueEnrichment, config, targetStep }) => {
          const id = config.id ?? targetStep;

          return {
            isStepSpecific: true,
            defaultId: id,
            form: beforeValueEnrichment,
          };
        },
      },
    },
  },
});

const u = t.withPlugins(
  formPlugin({
    render(data) {
      return (props: { test: string }) => {
        return '';
      };
    },
  })
);
u.createComponent(
  {
    stepData: ['step1'],
  },
  ({}) => ''
);
u.stepSchema.value.step1.createComponent(({}) => '');
