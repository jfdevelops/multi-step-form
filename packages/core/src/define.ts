import { InvalidInstanceError } from '@/errors/invalid-instance';
import { NoActiveInstanceError } from '@/errors/no-active-instance';
import { MultiStepFormSchema } from '@/schema';
import type {
  getDefaultValues,
  NameTransformCasingOptions,
} from '@/steps/fields';
import type { StepSpecificHelperFn } from '@/steps/fn-utils/helper-fn/utils';
import {
  instantiateSteps,
  type AnyConfig,
  type instantiateStepsConfig,
  type StepConfig,
  type StepNumbers,
  type StepOverrides,
} from '@/steps/steps';
import { functionalUpdate } from '@/steps/utils';
import { DEFAULT_STORAGE_KEY, type BaseStorageConfig } from '@/storage';
import type {
  CasingType,
  DefaultCasing,
  Expand,
  stripFunctions,
  Updater,
} from '@/utils';

/**
 * The name used for the single instance created when {@linkcode DefineMultiStepFormOptions.instances}
 * is omitted.
 */
export type DefaultInstanceName = typeof DEFAULT_INSTANCE_NAME;
export const DEFAULT_INSTANCE_NAME = 'default';

export type InstanceName<TInstances extends readonly string[] | undefined> =
  TInstances extends readonly string[]
    ? TInstances[number]
    : DefaultInstanceName;

export type DefineConfig<
  TSteps extends StepConfig = StepConfig,
  // NOTE: defaults to the wide `CasingType` (not `DefaultCasing`) — see the matching note on
  // `StepSchema.Config` in internals/step-schema.ts for why.
  TCasing extends CasingType = CasingType,
> = instantiateStepsConfig<TSteps> & NameTransformCasingOptions<TCasing>;

export type DefineMultiStepFormOptions<
  TSteps extends StepConfig = StepConfig,
  TInstances extends readonly string[] | undefined = undefined,
> = instantiateStepsConfig<TSteps> & {
  /**
   * The named instances this form definition can be created for (e.g. `['admin', 'client']`).
   *
   * If omitted, the factory produces a single, default instance.
   */
  instances?: TInstances;
};

/**
 * A storage key, either shared across every configured instance (a plain `string`) or
 * resolved per instance (a `Record` of instance name to key).
 */
export type StorageKey<TInstance extends string> =
  string | Record<TInstance, string>;

export interface ConfigureStorageConfig<TInstance extends string> {
  /**
   * The storage key to use. Either a single shared key, or a record of instance name to key.
   */
  key: StorageKey<TInstance>;
  store?: Storage;
  throwWhenUndefined?: boolean;
  /**
   * Which instances should have a real storage backend allocated for them.
   *
   * Instances not listed here (or when this whole `configure` block is omitted) are memory-only
   * — they never read from or write to storage.
   */
  configure?: {
    instances: readonly TInstance[];
  };
}

type UpdateStorageConfig<TInstance extends string> = Updater<
  TInstance,
  boolean
>;

export interface ConfigureUpdateConfig<TInstance extends string> {
  /**
   * An extra gate on top of {@linkcode ConfigureStorageConfig.configure}, evaluated per instance.
   *
   * If omitted, an instance persists by default whenever it has a storage backend allocated.
   * If provided, both this predicate and the storage allocation must agree for updates to persist.
   *
   * Can be a boolean, or a function that returns a boolean.
   *
   * @default true
   */
  updateStorage?: UpdateStorageConfig<TInstance>;
}

export type ConfigureOptions<
  TInstances extends readonly string[] | undefined = undefined,
  // NOTE: defaults to the wide `CasingType` (not `DefaultCasing`) — same rationale as
  // `DefineConfig` / `StepSchema.Config`. Call sites that want the runtime default pass
  // `DefaultCasing` explicitly (see {@linkcode MultiStepFormDefinition.configure}).
  TCasing extends CasingType = CasingType,
  TSteps extends StepConfig = StepConfig,
> = NameTransformCasingOptions<TCasing> & {
  /** Override resolvers applied to every instance created by this factory. */
  defaultOverrides?: WithOverridesMap<TSteps>;
  storage?: ConfigureStorageConfig<InstanceName<TInstances>>;
  update?: ConfigureUpdateConfig<InstanceName<TInstances>>;
};

export type WithOverridesMap<TSteps extends StepConfig> = Partial<{
  [
    key in keyof TSteps as string extends key ? never : key
  ]: TSteps[key] extends AnyConfig ? StepOverrides<TSteps[key]> : never;
}>;

export function mergeStepOverrides<TSteps extends StepConfig>(
  steps: TSteps,
  overrides: WithOverridesMap<TSteps> | undefined,
) {
  if (!overrides) {
    return steps;
  }

  return Object.fromEntries(
    Object.entries(steps as Record<string, object>).map(([key, stepConfig]) => {
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
    }),
  ) as TSteps;
}

interface OverrideResolvable {
  stepSchema: {
    resolveOverrides(): unknown;
  };
}

export function scheduleOverrideResolution<TInstance extends OverrideResolvable>(
  instance: TInstance,
  getCurrentInstance: () => TInstance | undefined,
) {
  queueMicrotask(() => {
    if (getCurrentInstance() === instance) {
      instance.stepSchema.resolveOverrides();
    }
  });
}

/**
 * The resolved instantiated value shape for a form definition's steps, independent of any
 * particular instance.
 */
export type DefineValue<TSteps extends StepConfig> = instantiateSteps<{
  steps: TSteps;
}>;

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

/**
 * Resolves {@linkcode ConfigureUpdateConfig.updateStorage} for a given instance.
 *
 * - Omitted → `true` (persist whenever storage is allocated)
 * - Boolean → used as-is
 * - Function → called with the instance name
 */
function resolveUpdateStorageGate<
  TInstances extends readonly string[] | undefined,
>(
  updateStorage: UpdateStorageConfig<InstanceName<TInstances>> | undefined,
  instanceName: InstanceName<TInstances>,
): boolean {
  if (updateStorage === undefined) {
    return true;
  }

  return functionalUpdate(updateStorage, instanceName);
}

export interface MultiStepFormInstance<
  def extends DefineConfig,
  value extends instantiateSteps<def> = instantiateSteps<def>,
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
   */
  withOverrides(
    overrides: WithOverridesMap<def['steps']>,
  ): MultiStepFormInstance<def, value>;
}

class MultiStepFormInstanceImpl<const def extends DefineConfig>
  extends MultiStepFormSchema<def>
  implements MultiStepFormInstance<def>
{
  readonly instanceName: string;
  readonly #rawSteps: def['steps'];
  readonly #storageConfig: BaseStorageConfig<string>;
  readonly #onRebuild: (next: MultiStepFormInstanceImpl<def>) => void;

  constructor(options: {
    steps: def['steps'];
    nameTransformCasing: def['nameTransformCasing'];
    storageConfig: BaseStorageConfig<string>;
    instanceName: string;
    onRebuild: (next: MultiStepFormInstanceImpl<def>) => void;
  }) {
    const {
      steps,
      nameTransformCasing,
      storageConfig,
      instanceName,
      onRebuild,
    } = options;

    super({
      steps,
      nameTransformCasing,
      storage: storageConfig,
    } as never);

    this.instanceName = instanceName;
    this.#rawSteps = steps;
    this.#storageConfig = storageConfig;
    this.#onRebuild = onRebuild;
  }

  withOverrides(overrides: WithOverridesMap<def['steps']>) {
    const mergedSteps = mergeStepOverrides(this.#rawSteps, overrides);

    const next = new MultiStepFormInstanceImpl<def>({
      steps: mergedSteps,
      nameTransformCasing: this.stepSchema.defaultNameTransformationCasing,
      storageConfig: this.#storageConfig,
      instanceName: this.instanceName,
      onRebuild: this.#onRebuild,
    });

    this.#onRebuild(next);

    next.stepSchema.resolveOverrides();

    return next as unknown as MultiStepFormInstance<def>;
  }
}

/**
 * The arguments the factory accepts when called. When `instances` was declared, `{ instance }`
 * is required. When it was omitted, the factory takes no arguments at all — there's only ever
 * one instance to create.
 */
export type MultiStepFormFactoryCallOptions<
  TInstances extends readonly string[] | undefined,
  TInstance extends InstanceName<TInstances> = InstanceName<TInstances>,
> = TInstances extends readonly string[]
  ? [options: { instance: TInstance }]
  : [];

export interface MultiStepFormFactoryStepFunctions<
  TSteps extends StepConfig,
  key extends StepNumbers<DefineValue<TSteps>>,
> {
  /**
   * Creates a helper function that dispatches to whichever instance is currently active
   * (the most recently created/used instance) when called.
   *
   * Throws {@linkcode NoActiveInstanceError} if no instance has been created yet.
   */
  createHelperFn: StepSpecificHelperFn<DefineValue<TSteps>, key>;
}

export interface MultiStepFormFactoryCreateValueOverrideFn<
  TSteps extends StepConfig,
> {
  <targetStep extends StepNumbers<DefineValue<TSteps>>>(options: {
    step: targetStep;
    values: (
      data: Expand<stripFunctions<DefineValue<TSteps>[targetStep]>>,
    ) =>
      | Partial<getDefaultValues<DefineValue<TSteps>, targetStep>>
      | Promise<Partial<getDefaultValues<DefineValue<TSteps>, targetStep>>>;
  }): (
    data: Expand<stripFunctions<DefineValue<TSteps>[targetStep]>>,
  ) =>
    | Partial<getDefaultValues<DefineValue<TSteps>, targetStep>>
    | Promise<Partial<getDefaultValues<DefineValue<TSteps>, targetStep>>>;
}

export function createValueOverride<data, result>(options: {
  step: string;
  values: (data: data) => result;
}) {
  return (data: data) => options.values(data);
}

export type MultiStepFormFactoryStepProperties<TSteps extends StepConfig> = {
  [key in StepNumbers<DefineValue<TSteps>>]: MultiStepFormFactoryStepFunctions<
    TSteps,
    key
  >;
};

export type MultiStepFormFactoryBase<
  TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined,
> = MultiStepFormFactoryStepProperties<TSteps> & {
  /** Creates a typed value override resolver for one step. */
  createValueOverride: MultiStepFormFactoryCreateValueOverrideFn<TSteps>;
  /**
   * Explicitly sets the active instance (the instance shared `createHelperFn`s dispatch to).
   *
   * Creating or re-using an instance via the factory call also marks it active; this is only
   * needed to switch back to an already-created instance.
   */
  setActiveInstance(instance: InstanceName<TInstances>): void;
  /**
   * The name of the currently active instance, or `undefined` if none has been created yet.
   */
  getActiveInstanceName(): InstanceName<TInstances> | undefined;
};

export type MultiStepFormFactory<
  TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined,
  TCasing extends CasingType = CasingType,
> = MultiStepFormFactoryBase<TSteps, TInstances> &
  (<TInstance extends InstanceName<TInstances>>(
    ...args: MultiStepFormFactoryCallOptions<TInstances, TInstance>
  ) => MultiStepFormInstance<DefineConfig<TSteps, TCasing>>);

function resolveStorageConfig<
  TInstances extends readonly string[] | undefined,
  TCasing extends CasingType,
  TSteps extends StepConfig,
>(
  instanceName: InstanceName<TInstances>,
  declaredInstances: TInstances,
  configureOptions: ConfigureOptions<TInstances, TCasing, TSteps>,
): BaseStorageConfig<string> {
  const { storage, update } = configureOptions;
  const configuredInstances: readonly InstanceName<TInstances>[] =
    storage?.configure?.instances ??
    (declaredInstances as readonly InstanceName<TInstances>[] | undefined) ??
    ([DEFAULT_INSTANCE_NAME] as unknown as readonly InstanceName<TInstances>[]);
  const hasStorage =
    Boolean(storage) && configuredInstances.includes(instanceName);
  const passesUpdateGate = resolveUpdateStorageGate<TInstances>(
    update?.updateStorage,
    instanceName,
  );
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

function createFactory<
  const TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined,
  const TCasing extends CasingType,
>(
  config: DefineMultiStepFormOptions<TSteps, TInstances>,
  configureOptions: ConfigureOptions<TInstances, TCasing, TSteps>,
): MultiStepFormFactory<TSteps, TInstances, TCasing> {
  const { steps, instances: declaredInstances } = config;
  const { defaultOverrides, nameTransformCasing } = configureOptions;
  const configuredSteps = mergeStepOverrides(steps as TSteps, defaultOverrides);
  const registry = new Map<
    InstanceName<TInstances>,
    MultiStepFormInstanceImpl<DefineConfig<TSteps, TCasing>>
  >();
  let activeInstance: InstanceName<TInstances> | undefined;

  function setActive(
    instanceName: InstanceName<TInstances>,
    instance: MultiStepFormInstanceImpl<DefineConfig<TSteps, TCasing>>,
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
    const instance = new MultiStepFormInstanceImpl<
      DefineConfig<TSteps, TCasing>
    >({
      steps: configuredSteps as DefineConfig<TSteps, TCasing>['steps'],
      nameTransformCasing,
      storageConfig,
      instanceName,
      onRebuild: (next) => setActive(instanceName, next),
    });

    setActive(instanceName, instance);
    scheduleOverrideResolution(instance, () => registry.get(instanceName));

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

  return Object.assign(factory, stepHelpers, {
    createValueOverride,
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
  }) as unknown as MultiStepFormFactory<TSteps, TInstances, TCasing>;
}

export class MultiStepFormDefinition<
  const TSteps extends StepConfig,
  TInstances extends readonly string[] | undefined = undefined,
> extends MultiStepFormSchema<DefineConfig<TSteps, DefaultCasing>> {
  constructor(
    private readonly config: DefineMultiStepFormOptions<TSteps, TInstances>,
  ) {
    // The definition keeps the complete legacy schema surface for immediate use, while
    // `configure()` creates separate stateful instances from the same immutable shape.
    super({ steps: config.steps } as DefineConfig<TSteps, DefaultCasing>);
  }

  /**
   * Configures storage and update-persistence behavior for this definition's instances.
   *
   * Also accepts {@linkcode ConfigureOptions.nameTransformCasing} — the schema-wide default
   * casing used to derive field labels. When omitted, defaults to `'title'`.
   *
   * @returns A callable factory used to create/retrieve named instances.
   */
  configure<const TCasing extends CasingType = DefaultCasing>(
    configureOptions: ConfigureOptions<
      TInstances,
      TCasing,
      TSteps
    > = {} as ConfigureOptions<TInstances, TCasing, TSteps>,
  ): MultiStepFormFactory<TSteps, TInstances, TCasing> {
    return createFactory<TSteps, TInstances, TCasing>(
      this.config,
      configureOptions,
    );
  }
}

/**
 * Defines a multi-step form that can be instantiated once (the default) or as several named,
 * independent instances (e.g. `'client'` and `'admin'`) sharing the same step/field definitions
 * and helper functions.
 *
 * @example
 * ```ts
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
 * const clientForm = createBookingForm({ instance: 'client' });
 * const adminForm = createBookingForm({ instance: 'admin' });
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
): MultiStepFormDefinition<steps, instances> {
  return new MultiStepFormDefinition<steps, instances>(options as never);
}
