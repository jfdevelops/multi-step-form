import type { ConditionExpression } from './conditions';

type Callback = (...arguments_: never[]) => unknown;

/** A base callback registered with {@link sharedFieldFunction}. */
export interface RegisteredFieldFunction<baseFunction extends Callback> {
  /** Identifies this registration as the callable receiving assigned members. */
  readonly type: 'base';
  /** The callable receiving the final assigned functions and properties. */
  readonly value: baseFunction;

  /**
   * Registers one callback for assignment to this base function.
   *
   * The callback is returned unchanged so its complete parameter, return, and
   * generic signatures remain available to the final inferred API.
   */
  registerFunction<assignedFunction extends Callback>(options: {
    type: 'assigned';
    value: assignedFunction;
  }): assignedFunction;
}

/** Configuration accepted by {@link sharedFieldFunction}. */
export interface SharedFieldFunctionOptions<
  baseFunction extends Callback,
  assignedFunctions extends Record<string, Callback>,
  assignedProperties extends object,
> {
  /** Base registration created by `sharedFieldFunction.registerFunction`. */
  base: RegisteredFieldFunction<baseFunction>;
  /** Named callbacks registered through the base registration. */
  assignedFunctions: assignedFunctions;
  /** Non-function state assigned to the callable. */
  assignedProperties?: assignedProperties;
}

/** Public callable and registration API for {@link sharedFieldFunction}. */
export interface SharedFieldFunction {
  /**
   * Assigns registered callbacks and properties to a registered base function.
   *
   * The result is inferred from the supplied registrations. A variable type
   * annotation can therefore validate the complete API without an explicit
   * generic argument on this function.
   */
  <
    baseFunction extends Callback,
    assignedFunctions extends Record<string, Callback>,
    assignedProperties extends object = Record<never, never>,
  >(
    options: SharedFieldFunctionOptions<
      baseFunction,
      assignedFunctions,
      assignedProperties
    >,
  ): baseFunction & assignedFunctions & assignedProperties;

  /** Registers the callable that will receive assigned API members. */
  registerFunction<baseFunction extends Callback>(options: {
    type: 'base';
    value: baseFunction;
  }): RegisteredFieldFunction<baseFunction>;
}

/**
 * Combines inherited and invocation-specific conditions without changing
 * either source expression.
 *
 * Bare condition arrays already represent an `and` group, but preserving the
 * two expressions as children also preserves any nested `or` groups.
 */
export function combineFieldFunctionConditions<context>(
  inherited: ConditionExpression<context> | undefined,
  additional: ConditionExpression<context> | undefined,
) {
  if (!inherited) {
    return additional;
  }

  if (!additional) {
    return inherited;
  }

  return { and: [inherited, additional] } as ConditionExpression<context>;
}

function registerBaseFunction<baseFunction extends Callback>(options: {
  type: 'base';
  value: baseFunction;
}): RegisteredFieldFunction<baseFunction> {
  function registerFunction<assignedFunction extends Callback>(registration: {
    type: 'assigned';
    value: assignedFunction;
  }) {
    return registration.value;
  }

  return {
    registerFunction,
    type: options.type,
    value: options.value,
  };
}

function createSharedFieldFunction<
  baseFunction extends Callback,
  assignedFunctions extends Record<string, Callback>,
  assignedProperties extends object = Record<never, never>,
>(
  options: SharedFieldFunctionOptions<
    baseFunction,
    assignedFunctions,
    assignedProperties
  >,
) {
  return Object.assign(
    options.base.value,
    options.assignedProperties,
    options.assignedFunctions,
  );
}

/**
 * Builds a callable field API from independently registered callbacks.
 *
 * Registering the base and assigned callbacks before composition preserves
 * their inferred signatures while keeping the final construction to one
 * object argument.
 */
export const sharedFieldFunction: SharedFieldFunction = Object.assign(
  createSharedFieldFunction,
  { registerFunction: registerBaseFunction },
);
