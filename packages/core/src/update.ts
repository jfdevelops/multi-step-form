import {
  createConditions,
  type ConditionExpression,
  type ConditionPredicate,
  type CreatedCondition,
} from './conditions';
import type { HelperFn } from './steps/fn-utils/helper-fn';
import type { UpdateFn } from './steps/fn-utils/update-fn';
import type { instantiateSteps, StepNumbers } from './steps/steps';
import { path } from './utils/path';
import type { DeepPartial, Expand } from './utils/types';
import {
  runStandardValidation,
  type AnyValidator,
  type ResolveValidatorOutput,
} from './utils/validator';
import {
  combineFieldFunctionConditions,
  sharedFieldFunction,
} from './field-function';

/** The result of attempting a conditional update. */
export type UpdateResult =
  | { executed: true }
  | { executed: false; reason: 'condition-failed' };

export namespace Update {
  export type Current<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
  > = UpdateFn.resolvedFieldValue<value, targetStep, fields>;

  export type Context<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
    input,
  > = {
    /** The latest value selected by `fields`. */
    current: Current<value, targetStep, fields>;
    /** The value supplied to a reusable update function. */
    input: input;
    /** The latest step update context. */
    ctx: Expand<HelperFn.BaseInput<value, [targetStep]>>;
  };

  export type Conditions<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
    input,
  > = ConditionExpression<Context<value, targetStep, fields, input>>;

  export interface SharedOptions<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
    input,
  > extends UpdateFn.DebugOptions {
    /** The fields selected by this update. */
    fields?: fields;
    /** Conditions that must pass immediately before the updater executes. */
    conditions?: Conditions<value, targetStep, fields, input>;
  }

  export interface BindOptions<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
    input,
  > extends SharedOptions<value, targetStep, fields, input> {
    /** Produces the next selected value from the latest state and supplied input. */
    updater: (
      context: Context<value, targetStep, fields, input>,
      input: input,
    ) => Current<value, targetStep, fields>;
  }

  export interface PatchOptions<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
    input,
  > extends SharedOptions<value, targetStep, fields, input> {
    /** Maps custom input to the shallow patch applied to the selected value. */
    patch?: (
      context: Context<value, targetStep, fields, input>,
    ) => DeepPartial<Current<value, targetStep, fields>>;
  }

  export interface Callable<context, arguments_ extends unknown[]> {
    (...arguments_: arguments_): UpdateResult;
    /** The immutable conditions configured on this callable. */
    readonly conditions: ConditionExpression<context> | undefined;

    /** Captures an invocation for explicit execution at a later time. */
    deferExecution(...arguments_: arguments_): () => UpdateResult;

    /** Executes this call with additional conditions. */
    forConditions(
      conditions: ConditionExpression<context>,
      ...arguments_: arguments_
    ): UpdateResult;

    /** Creates an immutable callable with additional inherited conditions. */
    withConditions(
      conditions: ConditionExpression<context>,
    ): Callable<context, arguments_>;

    /** Creates a reusable condition compatible with this callable. */
    createCondition(
      condition:
        | ConditionPredicate<context>
        | ConditionExpression<context>
        | {
            name: string;
            condition:
              | ConditionPredicate<context>
              | ConditionExpression<context>;
          },
    ): CreatedCondition<context>;
  }

  export type Bound<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
    input,
  > = Callable<Context<value, targetStep, fields, input>, [input]>;

  export interface Scope<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    scopedFields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    scopedInput = never,
  > {
    /** Immediately executes an update using the existing step update contract. */
    <
      fields extends UpdateFn.chosenFields<
        UpdateFn.resolvedStep<value, targetStep>
      > = scopedFields,
      input = undefined,
    >(
      options: SharedOptions<value, targetStep, fields, input> & {
        input?: input;
        updater: (
          context: Context<value, targetStep, fields, input>,
        ) => Current<value, targetStep, fields>;
      },
    ): UpdateResult;

    /** Creates a reusable parameterized updater. */
    bind<
      fields extends UpdateFn.chosenFields<
        UpdateFn.resolvedStep<value, targetStep>
      > = scopedFields,
      input = scopedInput,
    >(
      options: BindOptions<value, targetStep, fields, input>,
    ): Bound<value, targetStep, fields, input>;

    /** Creates a reusable shallow patch updater. */
    patch<
      fields extends UpdateFn.chosenFields<
        UpdateFn.resolvedStep<value, targetStep>
      > = scopedFields,
      input = [scopedInput] extends [never]
        ? DeepPartial<Current<value, targetStep, fields>>
        : scopedInput,
    >(
      options?: PatchOptions<value, targetStep, fields, input>,
    ): Bound<value, targetStep, fields, input>;

    /** Creates a reusable, strongly typed condition. */
    createCondition<
      fields extends UpdateFn.chosenFields<
        UpdateFn.resolvedStep<value, targetStep>
      > = scopedFields,
      input = scopedInput,
    >(
      condition:
        | ConditionPredicate<Context<value, targetStep, fields, input>>
        | Conditions<value, targetStep, fields, input>
        | {
            name: string;
            condition:
              | ConditionPredicate<Context<value, targetStep, fields, input>>
              | Conditions<value, targetStep, fields, input>;
          },
    ): CreatedCondition<Context<value, targetStep, fields, input>>;

    /** Creates a child scope with a fixed field selection. */
    forFields<
      const fields extends UpdateFn.chosenFields<
        UpdateFn.resolvedStep<value, targetStep>
      >,
    >(fields: fields): Scope<value, targetStep, fields, scopedInput>;

    /** Creates a child scope with validated reusable-function input. */
    withInput<const validator extends AnyValidator>(
      validator: validator,
    ): Scope<
      value,
      targetStep,
      scopedFields,
      ResolveValidatorOutput<validator>
    >;
  }

  /** A field-scoped update API. */
  export type Scoped<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    scopedFields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    scopedInput = never,
  > = Scope<value, targetStep, scopedFields, scopedInput>;

  export type StepWithScope<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
  > = value[targetStep] & {
    createUpdate: Scope<value, targetStep>;
  };
}

type RuntimeStep = {
  update(options: Record<string, unknown>): void;
  createUpdate?: unknown;
};

type RuntimeUpdateConfig = {
  getContext(): Record<string, unknown>;
  step: RuntimeStep;
};

type RuntimeScopeOptions = {
  fields?: unknown;
  inputValidator?: AnyValidator;
};

function getObjectPath(config: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (value === true) {
      paths.push(currentPath);
    } else if (typeof value === 'object' && value !== null) {
      paths.push(...getObjectPath(value as Record<string, unknown>, currentPath));
    }
  }

  return paths;
}

function getCurrentValue(ctx: Record<string, unknown>, fields: unknown) {
  const [currentStep] = Object.values(ctx);

  if (fields === undefined || fields === 'all') {
    return currentStep;
  }

  const selectedPaths = Array.isArray(fields)
    ? fields
    : getObjectPath(fields as Record<string, unknown>);

  return path.pickBy(
    currentStep as Record<string, unknown>,
    ...(selectedPaths as never[]),
  );
}

function mergePatch(current: unknown, patch: unknown) {
  if (
    typeof current === 'object' &&
    current !== null &&
    !Array.isArray(current) &&
    typeof patch === 'object' &&
    patch !== null &&
    !Array.isArray(patch)
  ) {
    return { ...current, ...patch };
  }

  return patch;
}

function createScopedUpdate<
  value extends instantiateSteps,
  targetStep extends StepNumbers<value>,
  fields extends UpdateFn.chosenFields<
    UpdateFn.resolvedStep<value, targetStep>
  > = 'all',
  input = never,
>(config: RuntimeUpdateConfig, scopeOptions: RuntimeScopeOptions = {}) {
  type chosenFields = UpdateFn.chosenFields<
    UpdateFn.resolvedStep<value, targetStep>
  >;

  function execute<executionFields extends chosenFields, executionInput>(
    options: Update.SharedOptions<
      value,
      targetStep,
      executionFields,
      executionInput
    > & {
      updater: (
        context: Update.Context<
          value,
          targetStep,
          executionFields,
          executionInput
        >,
      ) => Update.Current<value, targetStep, executionFields>;
    },
    inputValue: executionInput,
  ): UpdateResult {
    type executionContext = Update.Context<
      value,
      targetStep,
      executionFields,
      executionInput
    >;
    const selectedFields = options.fields ?? scopeOptions.fields ?? 'all';
    const conditionTools = createConditions<executionContext>();
    const ctx = config.getContext();
    const updateContext = {
      ctx,
      current: getCurrentValue(ctx, selectedFields),
      input: inputValue,
    } as executionContext;

    if (
      options.conditions &&
      !conditionTools.evaluate(options.conditions, updateContext)
    ) {
      return { executed: false, reason: 'condition-failed' };
    }

    const updatedValue = options.updater(updateContext);

    config.step.update({
      debug: options.debug,
      fields: selectedFields,
      silentErrors: options.silentErrors,
      updater: () => updatedValue,
    });

    return { executed: true };
  }

  function scopedUpdate<
    selectedFields extends chosenFields = fields,
    selectedInput = undefined,
  >(
    options: Update.SharedOptions<
      value,
      targetStep,
      selectedFields,
      selectedInput
    > & {
      input?: selectedInput;
      updater: (
        context: Update.Context<
          value,
          targetStep,
          selectedFields,
          selectedInput
        >,
      ) => Update.Current<value, targetStep, selectedFields>;
    },
  ) {
    return execute(options, options.input as selectedInput);
  }

  function createCallable<
    callableFields extends chosenFields,
    callableInput,
  >(
    options: Update.SharedOptions<
      value,
      targetStep,
      callableFields,
      callableInput
    >,
    updater: (
      context: Update.Context<
        value,
        targetStep,
        callableFields,
        callableInput
      >,
      input: callableInput,
    ) => Update.Current<value, targetStep, callableFields>,
  ) {
    type callableContext = Update.Context<
      value,
      targetStep,
      callableFields,
      callableInput
    >;
    const conditionTools = createConditions<callableContext>();
    const inheritedConditions = options.conditions;
    const selectedFields = (options.fields ??
      scopeOptions.fields ??
      'all') as callableFields;

    function validateInput(inputValue: callableInput) {
      if (!scopeOptions.inputValidator) {
        return inputValue;
      }

      if ('~standard' in scopeOptions.inputValidator) {
        return runStandardValidation(
          scopeOptions.inputValidator,
          inputValue,
        ) as callableInput;
      }

      return scopeOptions.inputValidator(inputValue) as callableInput;
    }

    function updateFunction(inputValue: callableInput) {
      const validatedInput = validateInput(inputValue);

      return execute(
        {
          ...options,
          conditions: inheritedConditions,
          fields: selectedFields,
          updater: (context: callableContext) =>
            updater(context, validatedInput),
        },
        validatedInput,
      );
    }

    function executeForConditions(
      conditions: ConditionExpression<callableContext>,
      inputValue: callableInput,
    ) {
      const validatedInput = validateInput(inputValue);

      return execute(
        {
          ...options,
          conditions: combineFieldFunctionConditions(
            inheritedConditions,
            conditions,
          ),
          fields: selectedFields,
          updater: (context: callableContext) =>
            updater(context, validatedInput),
        },
        validatedInput,
      );
    }

    function createWithConditions(
      conditions: ConditionExpression<callableContext>,
    ) {
      return createCallable(
        {
          ...options,
          conditions: combineFieldFunctionConditions(
            inheritedConditions,
            conditions,
          ),
          fields: selectedFields,
        },
        updater,
      );
    }

    const registeredUpdate = sharedFieldFunction.registerFunction({
      type: 'base',
      value: updateFunction,
    });
    const createCondition = registeredUpdate.registerFunction({
      type: 'assigned',
      value: conditionTools.createCondition,
    });
    const deferExecution = registeredUpdate.registerFunction({
      type: 'assigned',
      value: (inputValue: callableInput) => () => updateFunction(inputValue),
    });
    const forConditions = registeredUpdate.registerFunction({
      type: 'assigned',
      value: executeForConditions,
    });
    const withConditions = registeredUpdate.registerFunction({
      type: 'assigned',
      value: createWithConditions,
    });
    const callable: Update.Bound<
      value,
      targetStep,
      callableFields,
      callableInput
    > = sharedFieldFunction({
      base: registeredUpdate,
      assignedFunctions: {
        createCondition,
        deferExecution,
        forConditions,
        withConditions,
      },
      assignedProperties: { conditions: inheritedConditions },
    });

    return callable;
  }

  function createBoundUpdate<
    selectedFields extends chosenFields = fields,
    selectedInput = input,
  >(
    options: Update.BindOptions<
      value,
      targetStep,
      selectedFields,
      selectedInput
    >,
  ) {
    return createCallable(options, options.updater);
  }

  function createPatchUpdate<
    selectedFields extends chosenFields = fields,
    selectedInput = [input] extends [never]
      ? DeepPartial<Update.Current<value, targetStep, selectedFields>>
      : input,
  >(
    options: Update.PatchOptions<
      value,
      targetStep,
      selectedFields,
      selectedInput
    > = {},
  ) {
    return createCallable(options, (context, inputValue) =>
      mergePatch(
        context.current,
        options.patch ? options.patch(context) : inputValue,
      ) as Update.Current<value, targetStep, selectedFields>,
    );
  }

  function createUpdateCondition<
    selectedFields extends chosenFields = fields,
    selectedInput = input,
  >(
    condition:
      | ConditionPredicate<
          Update.Context<value, targetStep, selectedFields, selectedInput>
        >
      | Update.Conditions<
          value,
          targetStep,
          selectedFields,
          selectedInput
        >
      | {
          name: string;
          condition:
            | ConditionPredicate<
                Update.Context<
                  value,
                  targetStep,
                  selectedFields,
                  selectedInput
                >
              >
            | Update.Conditions<
                value,
                targetStep,
                selectedFields,
                selectedInput
              >;
        },
  ) {
    return createConditions<
      Update.Context<value, targetStep, selectedFields, selectedInput>
    >().createCondition(condition);
  }

  function createForFields<const nextFields extends chosenFields>(
    nextFields: nextFields,
  ) {
    return createScopedUpdate<value, targetStep, nextFields, input>(config, {
      ...scopeOptions,
      fields: nextFields,
    });
  }

  function createWithInput<const validator extends AnyValidator>(
    inputValidator: validator,
  ) {
    return createScopedUpdate<
      value,
      targetStep,
      fields,
      ResolveValidatorOutput<validator>
    >(config, {
      ...scopeOptions,
      inputValidator,
    });
  }

  const registeredUpdate = sharedFieldFunction.registerFunction({
    type: 'base',
    value: scopedUpdate,
  });
  const bind = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createBoundUpdate,
  });
  const createCondition = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createUpdateCondition,
  });
  const forFields = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createForFields,
  });
  const patch = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createPatchUpdate,
  });
  const withInput = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createWithInput,
  });
  const update: Update.Scoped<value, targetStep, fields, input> =
    sharedFieldFunction({
      base: registeredUpdate,
      assignedFunctions: {
        bind,
        createCondition,
        forFields,
        patch,
        withInput,
      },
    });

  return update;
}

/** The unscoped update API shared by core and framework packages. */
export interface CreateUpdate {
  /** Immediately executes an update against the supplied live step. */
  <
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    input = undefined,
  >(
    options: Update.SharedOptions<value, targetStep, fields, input> & {
      step: Update.StepWithScope<value, targetStep>;
      input?: input;
      updater: (
        context: Update.Context<value, targetStep, fields, input>,
      ) => Update.Current<value, targetStep, fields>;
    },
  ): UpdateResult;

  /** Creates a reusable updater against the supplied live step. */
  bind<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    input = never,
  >(
    options: Update.BindOptions<value, targetStep, fields, input> & {
      step: Update.StepWithScope<value, targetStep>;
    },
  ): Update.Bound<value, targetStep, fields, input>;

  /** Creates a reusable shallow patcher against the supplied live step. */
  patch<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    input = DeepPartial<Update.Current<value, targetStep, fields>>,
  >(
    options: Update.PatchOptions<value, targetStep, fields, input> & {
      step: Update.StepWithScope<value, targetStep>;
    },
  ): Update.Bound<value, targetStep, fields, input>;

  /** Creates a reusable condition when no narrower update scope is available. */
  createCondition<context>(
    condition:
      | ConditionPredicate<context>
      | ConditionExpression<context>
      | {
          name: string;
          condition:
            | ConditionPredicate<context>
            | ConditionExpression<context>;
        },
  ): CreatedCondition<context>;

  /** Creates a typed update API scoped to one live step. */
  forStep<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
  >(
    step: Update.StepWithScope<value, targetStep>,
  ): Update.Scope<value, targetStep>;
}

/**
 * Creates the common update API used by the core and React packages.
 *
 * Step values expose the same API through `step.createUpdate`. Keeping this
 * constructor in core ensures framework integrations share identical update,
 * bind, patch, and condition semantics.
 *
 * @example
 * ```ts
 * const patchConsent = update.patch({
 *   step: schema.stepSchema.value.step1,
 *   fields: ['fields.consent.defaultValue'],
 * });
 *
 * patchConsent({ promptOpen: true });
 * ```
 */
function createRootUpdate() {
  function rootUpdate<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    input = undefined,
  >(
    options: Update.SharedOptions<value, targetStep, fields, input> & {
      step: Update.StepWithScope<value, targetStep>;
      input?: input;
      updater: (
        context: Update.Context<value, targetStep, fields, input>,
      ) => Update.Current<value, targetStep, fields>;
    },
  ) {
    const { step, ...updateOptions } = options;
    return step.createUpdate(updateOptions);
  }

  function createBoundUpdate<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    input = never,
  >(
    options: Update.BindOptions<value, targetStep, fields, input> & {
      step: Update.StepWithScope<value, targetStep>;
    },
  ) {
    const { step, ...updateOptions } = options;
    return step.createUpdate.bind(updateOptions);
  }

  function createPatchUpdate<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
    input = DeepPartial<Update.Current<value, targetStep, fields>>,
  >(
    options: Update.PatchOptions<value, targetStep, fields, input> & {
      step: Update.StepWithScope<value, targetStep>;
    },
  ) {
    const { step, ...updateOptions } = options;
    return step.createUpdate.patch(updateOptions);
  }

  function createUpdateCondition<context>(
    condition:
      | ConditionPredicate<context>
      | ConditionExpression<context>
      | {
          name: string;
          condition:
            | ConditionPredicate<context>
            | ConditionExpression<context>;
        },
  ) {
    return createConditions<context>().createCondition(condition);
  }

  function createForStep<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
  >(step: Update.StepWithScope<value, targetStep>) {
    return step.createUpdate;
  }

  const registeredUpdate = sharedFieldFunction.registerFunction({
    type: 'base',
    value: rootUpdate,
  });
  const bind = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createBoundUpdate,
  });
  const createCondition = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createUpdateCondition,
  });
  const forStep = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createForStep,
  });
  const patch = registeredUpdate.registerFunction({
    type: 'assigned',
    value: createPatchUpdate,
  });
  const update: CreateUpdate = sharedFieldFunction({
    base: registeredUpdate,
    assignedFunctions: {
      bind,
      createCondition,
      forStep,
      patch,
    },
  });

  return update;
}

export const createUpdate = createRootUpdate();

/** The shared root update API. */
export const update = createUpdate;

/** @internal Creates the update API attached to an instantiated step. */
export function createStepUpdate<
  value extends instantiateSteps,
  targetStep extends StepNumbers<value>,
>(config: {
  getContext(): Record<string, unknown>;
  step: value[targetStep];
}) {
  return createScopedUpdate<value, targetStep>({
    getContext: config.getContext,
    step: config.step as RuntimeStep,
  });
}
