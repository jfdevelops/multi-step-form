import {
  DEFAULT_INSTANCE_NAME,
  DEFAULT_STORAGE_KEY,
  InvalidInstanceError,
  NoActiveInstanceError,
  type BaseStorageConfig,
  type CasingType,
  type ConfigureOptions,
  type DefaultCasing,
  type DefineConfig,
  type DefineMultiStepFormOptions,
  type Expand,
  type getDeepFields,
  type HelperFn,
  type HelperFnChosenSteps,
  InvalidComponentError,
  type InstanceName,
  type StepConfig,
  type StepNumbers,
  type StepSpecificHelperFn,
  type WithOverridesMap,
} from '@jfdevelops/multi-step-form-core';
import {
  type AnyMultiStepFormSchema,
  MultiStepFormSchema,
} from './schema';
import {
  type instantiateReactSteps,
  type StepSpecificComponent,
} from './steps';
import type {
  CreateComponent,
  CreatedMultiStepFormComponent,
} from './utils';
import { createElement, type ReactNode } from 'react';

// The factory schema is an API surface, not a persisted form instance. Keeping its
// store inert prevents it from reading or overwriting the shared default browser key.
const factorySchemaStorage: Storage = {
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  get length() {
    return 0;
  },
  removeItem() {},
  setItem() {},
};

/**
 * The resolved instantiated value shape for a form definition's steps, independent of any
 * particular instance.
 */
export type DefineReactValue<
  TSteps extends StepConfig,
  TCasing extends CasingType = DefaultCasing,
> = instantiateReactSteps<DefineConfig<TSteps, TCasing>>;

export interface MultiStepFormReactInstance<
  def extends DefineConfig,
  value extends instantiateReactSteps<def> = instantiateReactSteps<def>,
> extends MultiStepFormSchema<def, value> {
  /**
   * The name of this instance (e.g. `'client'` or `'admin'`).
   */
  readonly instanceName: string;
  /**
   * Attaches per-step override resolvers to this instance. Returns a new instance with the
   * overrides applied; the previous instance is superseded and this new one becomes active.
   *
   * Overrides supplied here are **not** shared across instances created from the same
   * definition — attach different overrides to each instance independently.
   *
   * Chain order: `createForm({ instance }).withOverrides(...).withForm(...).withContext()`.
   */
  withOverrides(
    overrides: WithOverridesMap<def['steps']>,
  ): MultiStepFormReactInstance<def, value>;
}

function createNoopStorage(): Storage {
  return {
    length: 0,
    clear() {},
    getItem() {
      return null;
    },
    key() {
      return null;
    },
    removeItem() {},
    setItem() {},
  };
}

function attachInstance<
  const def extends DefineConfig,
  TInstance extends string = string,
>(
  instance: MultiStepFormSchema<def>,
  options: {
    rawSteps: def['steps'];
    nameTransformCasing: def['nameTransformCasing'];
    storageConfig: BaseStorageConfig<string>;
    instanceName: TInstance;
    onRebuild: (next: MultiStepFormReactInstance<def>) => void;
  },
): MultiStepFormReactInstance<def> {
  const {
    rawSteps,
    nameTransformCasing,
    storageConfig,
    instanceName,
    onRebuild,
  } = options;

  return Object.assign(instance, {
    instanceName,
    withOverrides(overrides: WithOverridesMap<def['steps']>) {
      const mergedSteps = Object.fromEntries(
        Object.entries(rawSteps as Record<string, object>).map(
          ([key, stepConfig]) => {
            const override = (overrides as Record<string, unknown>)[key];

            return [
              key,
              override
                ? {
                    ...stepConfig,
                    overrides: override,
                  }
                : stepConfig,
            ];
          },
        ),
      ) as def['steps'];

      const next = attachInstance<def, TInstance>(
        new MultiStepFormSchema<def>({
          steps: mergedSteps,
          nameTransformCasing,
          storage: storageConfig,
        } as never),
        {
          rawSteps: mergedSteps,
          nameTransformCasing,
          storageConfig,
          instanceName,
          onRebuild,
        },
      );

      onRebuild(next);

      return next;
    },
  }) as MultiStepFormReactInstance<def>;
}

function resolveStorageConfig<
  TInstances extends readonly string[] | undefined,
  TCasing extends CasingType,
>(
  instanceName: InstanceName<TInstances>,
  declaredInstances: TInstances,
  configureOptions: ConfigureOptions<TInstances, TCasing>,
): BaseStorageConfig<string> {
  const { storage, update } = configureOptions;
  const configuredInstances: readonly InstanceName<TInstances>[] =
    storage?.configure?.instances ??
    (declaredInstances as readonly InstanceName<TInstances>[] | undefined) ??
    ([DEFAULT_INSTANCE_NAME] as unknown as readonly InstanceName<TInstances>[]);
  const hasStorage =
    Boolean(storage) && configuredInstances.includes(instanceName);
  const updateStorage = update?.updateStorage;
  const passesUpdateGate =
    updateStorage === undefined
      ? true
      : typeof updateStorage === 'function'
        ? updateStorage(instanceName)
        : updateStorage;
  const shouldPersist = hasStorage && passesUpdateGate;

  if (!shouldPersist) {
    return {
      key: `__memory__:${instanceName}`,
      store: createNoopStorage(),
    };
  }

  const key =
    typeof storage!.key === 'string'
      ? storage!.key
      : (storage!.key as Record<InstanceName<TInstances>, string>)[
          instanceName
        ];

  InvalidInstanceError.invariant(typeof key === 'string' && key.length > 0, {
    reason: `No storage key was found for instance "${instanceName}". Provide a "storage.key" string or a record containing a key for this instance.`,
    instance: instanceName,
  });

  return {
    key: key ?? DEFAULT_STORAGE_KEY,
    store: storage!.store,
    throwWhenUndefined: storage!.throwWhenUndefined,
  };
}

/**
 * The arguments the factory accepts when called. When `instances` was declared, `{ instance }`
 * is required. When it was omitted, the factory takes no arguments at all — there's only ever
 * one instance to create.
 */
export type MultiStepFormReactFactoryCallOptions<
  TInstances extends readonly string[] | undefined,
  TInstance extends InstanceName<TInstances> = InstanceName<TInstances>,
> = TInstances extends readonly string[]
  ? [options: { instance: TInstance }]
  : [];

export interface MultiStepFormReactFactoryStepFunctions<
  TSteps extends StepConfig,
  key extends StepNumbers<DefineReactValue<TSteps>>,
> {
  /**
   * Creates a helper function that dispatches to whichever instance is currently active
   * (the most recently created/used instance) when called.
   *
   * Throws {@linkcode NoActiveInstanceError} if no instance has been created yet.
   */
  createHelperFn: StepSpecificHelperFn<DefineReactValue<TSteps>, key>;
}

type FactoryFieldComponentProps<
  TSteps extends StepConfig,
  TCasing extends CasingType,
  targetStep extends StepNumbers<DefineReactValue<TSteps, TCasing>>,
  targetField extends getDeepFields<
    DefineReactValue<TSteps, TCasing>,
    targetStep
  >,
  customProps extends object,
  selectable extends boolean,
> = Expand<
  (selectable extends true
    ? StepSpecificComponent.selectableFieldComponentProps<
        DefineConfig<TSteps, TCasing>,
        DefineReactValue<TSteps, TCasing>,
        targetStep,
        targetField,
        customProps
      >
    : StepSpecificComponent.fieldComponentProps<
        DefineConfig<TSteps, TCasing>,
        DefineReactValue<TSteps, TCasing>,
        targetStep,
        targetField,
        customProps
      >) & {
    /** The configured form instance whose state and overrides this component reads. */
    instance: AnyMultiStepFormSchema;
  }
>;

interface MultiStepFormReactFactoryCreateComponentFn<
  TSteps extends StepConfig,
  TCasing extends CasingType,
> {
  <
    chosenSteps extends HelperFnChosenSteps.main<
      DefineReactValue<TSteps, TCasing>,
      StepNumbers<DefineReactValue<TSteps, TCasing>>
    >,
    props = undefined,
  >(
    config: HelperFn.BaseOptions<
      DefineReactValue<TSteps, TCasing>,
      chosenSteps
    > & {
      render: CreateComponent<
        StepSpecificComponent.instanceInput<
          DefineConfig<TSteps, TCasing>,
          DefineReactValue<TSteps, TCasing>,
          chosenSteps
        >,
        props
      >;
    },
  ): CreatedMultiStepFormComponent<props>;

  forField<
    targetStep extends StepNumbers<DefineReactValue<TSteps, TCasing>>,
    targetField extends getDeepFields<
      DefineReactValue<TSteps, TCasing>,
      targetStep
    >,
    customProps extends object = {},
  >(
    config: StepSpecificComponent.fieldConfig<
      DefineConfig<TSteps, TCasing>,
      DefineReactValue<TSteps, TCasing>,
      targetStep,
      targetField,
      customProps
    > & { step: targetStep },
  ): (
    props: FactoryFieldComponentProps<
      TSteps,
      TCasing,
      targetStep,
      targetField,
      customProps,
      false
    >,
  ) => ReactNode;

  forField<
    targetStep extends StepNumbers<DefineReactValue<TSteps, TCasing>>,
    customProps extends object = {},
  >(
    config: StepSpecificComponent.selectableFieldConfig<
      DefineConfig<TSteps, TCasing>,
      DefineReactValue<TSteps, TCasing>,
      targetStep,
      getDeepFields<DefineReactValue<TSteps, TCasing>, targetStep>,
      customProps
    > & { step: targetStep },
  ): (
    props: FactoryFieldComponentProps<
      TSteps,
      TCasing,
      targetStep,
      getDeepFields<DefineReactValue<TSteps, TCasing>, targetStep>,
      customProps,
      true
    >,
  ) => ReactNode;
}

interface MultiStepFormReactFactoryStepCreateComponentFn<
  TSteps extends StepConfig,
  TCasing extends CasingType,
  targetStep extends StepNumbers<DefineReactValue<TSteps, TCasing>>,
> {
  <additionalCtx extends Record<string, unknown> = {}, props = undefined>(
    config: StepSpecificComponent.config<
      DefineConfig<TSteps, TCasing>,
      DefineReactValue<TSteps, TCasing>,
      targetStep,
      props,
      additionalCtx
    >,
  ): CreatedMultiStepFormComponent<props>;

  forField<
    targetField extends getDeepFields<
      DefineReactValue<TSteps, TCasing>,
      targetStep
    >,
    customProps extends object = {},
  >(
    config: StepSpecificComponent.fieldConfig<
      DefineConfig<TSteps, TCasing>,
      DefineReactValue<TSteps, TCasing>,
      targetStep,
      targetField,
      customProps
    >,
  ): (
    props: FactoryFieldComponentProps<
      TSteps,
      TCasing,
      targetStep,
      targetField,
      customProps,
      false
    >,
  ) => ReactNode;

  forField<customProps extends object = {}>(
    config: StepSpecificComponent.selectableFieldConfig<
      DefineConfig<TSteps, TCasing>,
      DefineReactValue<TSteps, TCasing>,
      targetStep,
      getDeepFields<DefineReactValue<TSteps, TCasing>, targetStep>,
      customProps
    >,
  ): (
    props: FactoryFieldComponentProps<
      TSteps,
      TCasing,
      targetStep,
      getDeepFields<DefineReactValue<TSteps, TCasing>, targetStep>,
      customProps,
      true
    >,
  ) => ReactNode;
}

type MultiStepFormReactFactoryStepSchema<
  TSteps extends StepConfig,
  TCasing extends CasingType,
> = Omit<
  MultiStepFormSchema<DefineConfig<TSteps, TCasing>>['stepSchema'],
  'value'
> & {
  value: {
    [targetStep in StepNumbers<DefineReactValue<TSteps, TCasing>>]: Omit<
      DefineReactValue<TSteps, TCasing>[targetStep],
      'createComponent'
    > & {
      createComponent: MultiStepFormReactFactoryStepCreateComponentFn<
        TSteps,
        TCasing,
        targetStep
      >;
    };
  };
};

export type MultiStepFormReactFactoryStepProperties<TSteps extends StepConfig> =
  {
    [
      key in StepNumbers<DefineReactValue<TSteps>>
    ]: MultiStepFormReactFactoryStepFunctions<TSteps, key>;
  };

export type MultiStepFormReactFactoryBase<
  TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined,
  TCasing extends CasingType,
> = Omit<
  MultiStepFormSchema<DefineConfig<TSteps, TCasing>>,
  'createComponent' | 'stepSchema'
> &
  MultiStepFormReactFactoryStepProperties<TSteps> & {
  createComponent: MultiStepFormReactFactoryCreateComponentFn<TSteps, TCasing>;
  stepSchema: MultiStepFormReactFactoryStepSchema<TSteps, TCasing>;
  /**
   * Explicitly sets the active instance (the instance shared `createHelperFn`s dispatch to).
   *
   * A `<MultiStepFormProvider />` (or equivalent) typically calls this on mount so shared
   * helpers dispatch to whichever instance the current part of the tree owns.
   */
  setActiveInstance(instance: InstanceName<TInstances>): void;
  /**
   * The name of the currently active instance, or `undefined` if none has been created yet.
   */
  getActiveInstanceName(): InstanceName<TInstances> | undefined;
};

function attachFactorySchemaSurface<const def extends DefineConfig>(
  factory: Function,
  schema: MultiStepFormSchema<def>,
) {
  // The callable factory needs the same public schema API as the old schema constructor, but
  // its schema must stay outside the instance registry so factory and instance state cannot leak.
  Object.defineProperties(factory, {
    defaultNameTransformationCasing: {
      enumerable: true,
      get: () => schema.defaultNameTransformationCasing,
    },
    stepSchema: {
      enumerable: true,
      get: () => schema.stepSchema,
    },
    storage: {
      enumerable: true,
      get: () => schema.storage,
    },
    storageConfig: {
      enumerable: true,
      get: () => schema.storageConfig,
    },
    context: {
      enumerable: true,
      get: () => schema.context,
      set: (context) => {
        schema.context = context;
      },
    },
    subscribe: { value: schema.subscribe },
    hasListeners: { value: schema.hasListeners.bind(schema) },
    getSnapshot: { value: schema.getSnapshot.bind(schema) },
    mount: { value: schema.mount.bind(schema) },
    unmount: { value: schema.unmount.bind(schema) },
    isMounted: { value: schema.isMounted.bind(schema) },
    withForm: { value: schema.withForm.bind(schema) },
    withContext: { value: schema.withContext.bind(schema) },
  });

  return factory;
}

export type MultiStepFormReactFactory<
  TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined,
  TCasing extends CasingType = CasingType,
> = MultiStepFormReactFactoryBase<TSteps, TInstances, TCasing> &
  (<TInstance extends InstanceName<TInstances>>(
    ...args: MultiStepFormReactFactoryCallOptions<TInstances, TInstance>
  ) => MultiStepFormReactInstance<DefineConfig<TSteps, TCasing>>);

function createReactFactory<
  const TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined,
  const TCasing extends CasingType,
>(
  config: DefineMultiStepFormOptions<TSteps, TInstances>,
  configureOptions: ConfigureOptions<TInstances, TCasing>,
): MultiStepFormReactFactory<TSteps, TInstances, TCasing> {
  const { steps, instances: declaredInstances } = config;
  const { nameTransformCasing } = configureOptions;
  const registry = new Map<
    InstanceName<TInstances>,
    MultiStepFormReactInstance<DefineConfig<TSteps, TCasing>>
  >();
  const factorySchema = new MultiStepFormSchema<
    DefineConfig<TSteps, TCasing>
  >({
    steps: steps as DefineConfig<TSteps, TCasing>['steps'],
    nameTransformCasing,
    storage: {
      key: DEFAULT_STORAGE_KEY,
      store: factorySchemaStorage,
    },
  } as never);
  let activeInstance: InstanceName<TInstances> | undefined;

  function setActive(
    instanceName: InstanceName<TInstances>,
    instance: MultiStepFormReactInstance<DefineConfig<TSteps, TCasing>>,
  ) {
    registry.set(instanceName, instance);
    activeInstance = instanceName;
  }

  function createInstance(instanceName: InstanceName<TInstances>) {
    const storageConfig = resolveStorageConfig(
      instanceName,
      declaredInstances as TInstances,
      configureOptions,
    );
    const instance = attachInstance<
      DefineConfig<TSteps, TCasing>,
      InstanceName<TInstances>
    >(
      new MultiStepFormSchema<DefineConfig<TSteps, TCasing>>({
        steps: steps as DefineConfig<TSteps, TCasing>['steps'],
        nameTransformCasing,
        storage: storageConfig,
      } as never),
      {
        rawSteps: steps as DefineConfig<TSteps, TCasing>['steps'],
        nameTransformCasing,
        storageConfig,
        instanceName,
        onRebuild: (next) => setActive(instanceName, next),
      },
    );

    setActive(instanceName, instance);

    return instance;
  }

  function factory(options?: { instance?: InstanceName<TInstances> }) {
    const instanceName =
      options?.instance ?? (DEFAULT_INSTANCE_NAME as InstanceName<TInstances>);

    if (declaredInstances) {
      InvalidInstanceError.invariant(declaredInstances.includes(instanceName), {
        reason: `"${instanceName}" is not a valid instance. Valid instances are: ${declaredInstances.join(', ')}`,
        instance: instanceName,
        validInstances: declaredInstances,
      });
    }

    const existing = registry.get(instanceName);

    if (existing) {
      activeInstance = instanceName;

      return existing;
    }

    return createInstance(instanceName);
  }

  function getActiveInstance() {
    NoActiveInstanceError.invariant(
      activeInstance !== undefined && registry.has(activeInstance),
      {
        reason:
          'No active instance was found. Create an instance first (e.g. `createForm({ instance: "client" })`) before calling a shared helper function.',
        availableInstances: [...registry.keys()],
      },
    );

    return registry.get(activeInstance)!;
  }

  const stepKeys = Object.keys(steps);
  const stepHelpers = Object.fromEntries(
    stepKeys.map((stepKey) => [
      stepKey,
      {
        createHelperFn: (optionsOrFn: unknown, fn?: unknown) => {
          return (input?: unknown) => {
            const active = getActiveInstance();
            const stepValue = (
              active.stepSchema.value as Record<string, unknown>
            )[stepKey] as {
              createHelperFn: (
                a: unknown,
                b?: unknown,
              ) => (i?: unknown) => unknown;
            };

            return stepValue.createHelperFn(optionsOrFn, fn)(input);
          };
        },
      },
    ]),
  );

  const sharedFieldComponent = {
    forField(componentConfig: {
      step: string;
      field?: string;
      render: (field: unknown, props: unknown) => ReactNode;
    }) {
      // Each explicitly selected instance gets its own bound component. Caching preserves
      // component identity and subscriptions without relying on mutable global selection.
      const components = new WeakMap<object, (props?: unknown) => ReactNode>();

      return (props?: unknown) => {
        InvalidComponentError.invariant(
          typeof props === 'object' &&
            props !== null &&
            'instance' in props,
          {
            reason:
              'A shared field component requires an "instance" prop containing the configured form instance it should use',
            component: 'createFieldComponent',
            argument: 'props.instance',
            value: props,
          },
        );

        const { instance, ...componentProps } = props as {
          instance: AnyMultiStepFormSchema;
        } & Record<string, unknown>;
        let Component = components.get(instance);

        if (!Component) {
          const step = (instance.stepSchema.value as Record<string, unknown>)[
            componentConfig.step
          ] as {
            createComponent: {
              forField: (config: {
                field?: string;
                render: (field: unknown, props: unknown) => ReactNode;
              }) => (props?: unknown) => ReactNode;
            };
          };

          Component = step.createComponent.forField({
            field: componentConfig.field,
            render: componentConfig.render,
          });
          components.set(instance, Component);
        }

        return createElement(Component as never, componentProps as never);
      };
    },
  };

  // The factory schema exposes the definition's step surface, but its reusable field
  // components must bind to a real configured instance instead of the inert schema state.
  for (const stepKey of stepKeys) {
    const step = (factorySchema.stepSchema.value as Record<string, unknown>)[
      stepKey
    ] as {
      createComponent: Function & {
        forField: (config: {
          field?: string;
          render: (field: unknown, props: unknown) => ReactNode;
        }) => (props?: unknown) => ReactNode;
      };
    };

    Object.assign(step.createComponent, {
      forField: (config: {
        field?: string;
        render: (field: unknown, props: unknown) => ReactNode;
      }) => sharedFieldComponent.forField({ ...config, step: stepKey }),
    });
  }

  const sharedCreateComponent = Object.assign(
    function createFactoryComponent(componentConfig: unknown) {
      return factorySchema.createComponent(componentConfig as never);
    },
    sharedFieldComponent,
  ) as unknown as MultiStepFormReactFactoryCreateComponentFn<
    TSteps,
    TCasing
  >;

  return Object.assign(
    attachFactorySchemaSurface(factory, factorySchema),
    stepHelpers,
    {
      createComponent: sharedCreateComponent,
      setActiveInstance(instanceName: InstanceName<TInstances>) {
        InvalidInstanceError.invariant(registry.has(instanceName), {
          reason: `"${instanceName}" has not been created yet. Call the factory with this instance first.`,
          instance: instanceName,
        });
        activeInstance = instanceName;
      },
      getActiveInstanceName() {
        return activeInstance;
      },
    },
  ) as unknown as MultiStepFormReactFactory<TSteps, TInstances, TCasing>;
}

export class MultiStepFormReactDefinition<
  const TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined = undefined,
> extends MultiStepFormSchema<DefineConfig<TSteps, DefaultCasing>> {
  constructor(
    private readonly config: DefineMultiStepFormOptions<TSteps, TInstances>,
  ) {
    // The definition remains a fully usable React schema, while `configure()` creates
    // independent instances that reuse only its declared shape.
    super({ steps: config.steps } as DefineConfig<TSteps, DefaultCasing>);
  }

  /**
   * Configures storage and update-persistence behavior for this definition's instances.
   *
   * Also accepts {@linkcode ConfigureOptions} `nameTransformCasing` — the schema-wide default
   * casing used to derive field labels. When omitted, defaults to `'title'`.
   *
   * @returns A callable factory used to create/retrieve named instances.
   */
  configure<const TCasing extends CasingType = DefaultCasing>(
    configureOptions: ConfigureOptions<
      TInstances,
      TCasing
    > = {} as ConfigureOptions<TInstances, TCasing>,
  ): MultiStepFormReactFactory<TSteps, TInstances, TCasing> {
    return createReactFactory<TSteps, TInstances, TCasing>(
      this.config,
      configureOptions,
    );
  }
}

/**
 * Defines a multi-step form (React edition) that can be instantiated once (the default) or as
 * several named, independent instances (e.g. `'client'` and `'admin'`) sharing the same
 * step/field definitions and helper functions.
 *
 * @example
 * ```tsx
 * const createBookingForm = defineMultiStepForm({
 *   steps: {
 *     step1: {
 *       title: 'Contact info',
 *       fields: { firstName: { defaultValue: '', isRequired: true } },
 *     },
 *   },
 *   instances: ['admin', 'client'],
 * }).configure({
 *   storage: {
 *     key: { client: 'booking:client', admin: 'booking:admin' },
 *     configure: { instances: ['client'] },
 *   },
 * });
 *
 * const publicForm = createBookingForm({ instance: 'client' })
 *   .withOverrides({ step1: async ({ fields }) => ({ firstName: '' }) })
 *   .withForm({ render: ({ id }, props) => <form id={id} {...props} /> })
 *   .withContext();
 * ```
 */
export function defineMultiStepForm<
  const steps extends StepConfig,
  const contextualSteps extends StepConfig,
  const instances extends readonly string[] | undefined = undefined,
>(
  options: {
    steps: steps;
    instances?: instances;
  } & DefineMultiStepFormOptions<contextualSteps, instances>,
): MultiStepFormReactDefinition<steps, instances> {
  return new MultiStepFormReactDefinition<steps, instances>(options as never);
}
