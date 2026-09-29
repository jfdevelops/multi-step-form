import {
  createConditions,
  type ConditionExpression,
  type ConditionPredicate,
  type CreatedCondition,
} from './conditions';
import {
  combineFieldFunctionConditions,
  sharedFieldFunction,
} from './field-function';
import type { HelperFn } from './steps/fn-utils/helper-fn';
import type { UpdateFn } from './steps/fn-utils/update-fn';
import type { instantiateSteps, StepNumbers } from './steps/steps';
import { path } from './utils/path';
import type { Expand } from './utils/types';
import type { UpdateResult } from './update';

export namespace Reset {
  export type Context<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
  > = {
    /** The latest value selected by `fields`. */
    current: UpdateFn.resolvedFieldValue<value, targetStep, fields>;
    /** The latest step context. */
    ctx: Expand<HelperFn.BaseInput<value, [targetStep]>>;
  };

  export type Conditions<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    >,
  > = ConditionExpression<Context<value, targetStep, fields>>;

  export type Scope<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
  > = ((options?: UpdateFn.DebugOptions) => UpdateResult) & {
    /** Conditions inherited by every invocation. */
    readonly conditions: Conditions<value, targetStep, fields> | undefined;

    /** Executes one reset with additional conditions. */
    forConditions(
      conditions: Conditions<value, targetStep, fields>,
      options?: UpdateFn.DebugOptions,
    ): UpdateResult;

    /** Creates an immutable reset callable with additional conditions. */
    withConditions(
      conditions: Conditions<value, targetStep, fields>,
    ): Scope<value, targetStep, fields>;

    /** Creates a reusable condition compatible with this reset scope. */
    createCondition(
      condition:
        | ConditionPredicate<Context<value, targetStep, fields>>
        | Conditions<value, targetStep, fields>
        | {
            name: string;
            condition:
              | ConditionPredicate<Context<value, targetStep, fields>>
              | Conditions<value, targetStep, fields>;
          },
    ): CreatedCondition<Context<value, targetStep, fields>>;

    /** Creates a reset callable scoped to another field selection. */
    forFields<
      const nextFields extends UpdateFn.chosenFields<
        UpdateFn.resolvedStep<value, targetStep>
      >,
    >(
      fields: nextFields,
    ): Scope<value, targetStep, nextFields>;
  };

  /** A field-scoped reset callable. */
  export type Scoped<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
  > = Scope<value, targetStep, fields>;

  export type StepWithScope<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
  > = value[targetStep] & {
    createReset: Scope<value, targetStep>;
  };
}

type RuntimeResetConfig = {
  getContext(): Record<string, unknown>;
  reset(options?: Record<string, unknown>): void;
};

function getObjectPath(config: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;

    if (value === true) {
      paths.push(currentPath);
    } else if (typeof value === 'object' && value !== null) {
      paths.push(
        ...getObjectPath(value as Record<string, unknown>, currentPath),
      );
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

function createScopedReset<
  value extends instantiateSteps,
  targetStep extends StepNumbers<value>,
  selectedFields extends UpdateFn.chosenFields<
    UpdateFn.resolvedStep<value, targetStep>
  > = 'all',
>(
  config: RuntimeResetConfig,
  fields: selectedFields = 'all' as selectedFields,
  inheritedConditions?: Reset.Conditions<value, targetStep, selectedFields>,
) {
  type context = Reset.Context<value, targetStep, selectedFields>;
  const conditionTools = createConditions<context>();

  function executeReset(
    options: UpdateFn.DebugOptions | undefined,
    conditions: ConditionExpression<context> | undefined,
  ): UpdateResult {
    const ctx = config.getContext();
    const conditionContext = {
      ctx,
      current: getCurrentValue(ctx, fields),
    } as context;

    if (conditions && !conditionTools.evaluate(conditions, conditionContext)) {
      return { executed: false, reason: 'condition-failed' };
    }

    config.reset({
      ...options,
      fields,
    });

    return { executed: true };
  }

  const scopedReset = sharedFieldFunction.registerFunction({
    type: 'base',
    value: (options?: UpdateFn.DebugOptions) =>
      executeReset(options, inheritedConditions),
  });
  const createCondition = scopedReset.registerFunction({
    type: 'assigned',
    value: conditionTools.createCondition,
  });
  const forConditions = scopedReset.registerFunction({
    type: 'assigned',
    value: (
      conditions: ConditionExpression<context>,
      options?: UpdateFn.DebugOptions,
    ) => {
      return executeReset(
        options,
        combineFieldFunctionConditions(inheritedConditions, conditions),
      );
    },
  });
  const forFields = scopedReset.registerFunction({
    type: 'assigned',
    value: <
      nextFields extends UpdateFn.chosenFields<
        UpdateFn.resolvedStep<value, targetStep>
      >,
    >(
      nextFields: nextFields,
    ) =>
      createScopedReset<value, targetStep, nextFields>(
        config,
        nextFields,
        inheritedConditions as never,
      ),
  });
  const withConditions = scopedReset.registerFunction({
    type: 'assigned',
    value: (conditions: ConditionExpression<context>) =>
      createScopedReset<value, targetStep, selectedFields>(
        config,
        fields,
        combineFieldFunctionConditions(inheritedConditions, conditions),
      ),
  });

  const reset: Reset.Scoped<value, targetStep, selectedFields> =
    sharedFieldFunction({
      base: scopedReset,
      assignedFunctions: {
        createCondition,
        forConditions,
        forFields,
        withConditions,
      },
      assignedProperties: {
        conditions: inheritedConditions,
      },
    });

  return reset;
}

/**
 * Shared reset API exposed by the core and React packages.
 *
 * @example
 * ```ts
 * const resetConsent = schema.stepSchema.value.step1.createReset.forFields([
 *   'fields.consent.defaultValue',
 * ]);
 *
 * resetConsent();
 * ```
 */
export interface CreateReset {
  /** Executes a reset against the supplied live step. */
  <
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
  >(
    options: UpdateFn.DebugOptions & {
      step: Reset.StepWithScope<value, targetStep>;
      fields?: fields;
    },
  ): UpdateResult;

  /** Creates a typed reset API scoped to one live step. */
  forStep<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
  >(
    step: Reset.StepWithScope<value, targetStep>,
  ): Reset.Scope<value, targetStep>;
}

function createRootReset() {
  function rootReset<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
    fields extends UpdateFn.chosenFields<
      UpdateFn.resolvedStep<value, targetStep>
    > = 'all',
  >(
    options: UpdateFn.DebugOptions & {
      step: Reset.StepWithScope<value, targetStep>;
      fields?: fields;
    },
  ) {
    const { step, fields, ...debugOptions } = options;

    return fields === undefined
      ? step.createReset(debugOptions)
      : step.createReset.forFields(fields)(debugOptions);
  }

  function createForStep<
    value extends instantiateSteps,
    targetStep extends StepNumbers<value>,
  >(step: Reset.StepWithScope<value, targetStep>) {
    return step.createReset;
  }

  const registeredReset = sharedFieldFunction.registerFunction({
    type: 'base',
    value: rootReset,
  });
  const forStep = registeredReset.registerFunction({
    type: 'assigned',
    value: createForStep,
  });
  const reset: CreateReset = sharedFieldFunction({
    base: registeredReset,
    assignedFunctions: { forStep },
  });

  return reset;
}

export const createReset = createRootReset();

/** The shared root reset API. */
export const reset = createReset;

/** @internal Creates the reset API attached to an instantiated step. */
export function createStepReset<
  value extends instantiateSteps,
  targetStep extends StepNumbers<value>,
>(config: RuntimeResetConfig) {
  return createScopedReset<value, targetStep>(config);
}
