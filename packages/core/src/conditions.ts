/** A condition that can be evaluated against a context. */
export type ConditionPredicate<context> = (context: context) => boolean;

/** A static or context-aware condition. */
export type ConditionLeaf<context> = boolean | ConditionPredicate<context>;

/** A condition leaf or a nested logical condition group. */
export type ConditionNode<context> =
  | ConditionLeaf<context>
  | ConditionObject<context>;

/**
 * A non-empty list of conditions. Bare arrays use `and` semantics.
 */
export type ConditionArray<context> = readonly [
  ConditionNode<context>,
  ...ConditionNode<context>[],
];

/**
 * A recursive logical condition group.
 *
 * Each object intentionally accepts one operator. Nest another object to mix
 * `and` and `or` without relying on an ambiguous implicit relationship.
 */
export type ConditionObject<context> =
  | {
      readonly and: ConditionArray<context> | ConditionObject<context>;
      readonly or?: never;
    }
  | {
      readonly or: ConditionArray<context> | ConditionObject<context>;
      readonly and?: never;
    };

/** A complete recursive condition expression. */
export type ConditionExpression<context> =
  | ConditionArray<context>
  | ConditionObject<context>;

/** A named condition predicate created by {@link createConditions}. */
export type CreatedCondition<context> = ConditionPredicate<context> & {
  /** An optional diagnostic name for errors and development tools. */
  readonly conditionName?: string;
};

/** Options for creating a named condition. */
export interface NamedCondition<context> {
  /** A diagnostic name for the condition. */
  name: string;
  /** The predicate or expression represented by the condition. */
  condition: ConditionPredicate<context> | ConditionExpression<context>;
}

/** Utilities for constructing and evaluating condition expressions. */
export interface Conditions<context> {
  /**
   * Creates a reusable condition from a predicate or condition expression.
   *
   * Expressions are evaluated with the same short-circuit semantics as
   * {@link Conditions.evaluate}.
   */
  createCondition(
    condition:
      | ConditionPredicate<context>
      | ConditionExpression<context>
      | NamedCondition<context>,
  ): CreatedCondition<context>;

  /** Creates an explicit non-empty `and` expression. */
  and(
    first: ConditionNode<context>,
    ...conditions: ConditionNode<context>[]
  ): ConditionObject<context>;

  /** Creates an explicit non-empty `or` expression. */
  or(
    first: ConditionNode<context>,
    ...conditions: ConditionNode<context>[]
  ): ConditionObject<context>;

  /** Evaluates an expression against the supplied context. */
  evaluate(
    expression: ConditionExpression<context>,
    context: context,
  ): boolean;

  /** Compiles an expression into a reusable predicate. */
  compile(expression: ConditionExpression<context>): CreatedCondition<context>;

  /** Combines expressions with `and` semantics. */
  combine(
    first: ConditionExpression<context>,
    ...expressions: ConditionExpression<context>[]
  ): ConditionObject<context>;

  /** Converts array shorthand into an explicit root condition object. */
  normalize(expression: ConditionExpression<context>): ConditionObject<context>;
}

function isConditionObject<context>(
  condition: ConditionNode<context> | ConditionExpression<context>,
): condition is ConditionObject<context> {
  return typeof condition === 'object' && condition !== null && !Array.isArray(condition);
}

function isNamedCondition<context>(
  condition:
    | ConditionPredicate<context>
    | ConditionExpression<context>
    | NamedCondition<context>,
): condition is NamedCondition<context> {
  return (
    typeof condition === 'object' &&
    condition !== null &&
    !Array.isArray(condition) &&
    'name' in condition &&
    'condition' in condition
  );
}

function evaluateLeaf<context>(condition: ConditionLeaf<context>, context: context) {
  return typeof condition === 'function' ? condition(context) : condition;
}

/**
 * Creates dependency-free utilities for recursive boolean condition trees.
 *
 * Bare arrays use `and` semantics. Logical groups short-circuit from left to
 * right, and nested groups may freely mix `and` and `or` operators.
 *
 * This module deliberately has no form or update dependencies so it can be
 * extracted into a standalone conditions package without changing consumers.
 */
export function createConditions<context>(): Conditions<context> {
  function evaluateNode(condition: ConditionNode<context>, context: context): boolean {
    if (isConditionObject(condition)) {
      return evaluate(condition, context);
    }

    return evaluateLeaf(condition, context);
  }

  function evaluate(
    expression: ConditionExpression<context>,
    context: context,
  ): boolean {
    if (Array.isArray(expression)) {
      return expression.every((condition) => evaluateNode(condition, context));
    }

    const conditionObject = expression as ConditionObject<context>;

    if ('and' in conditionObject && conditionObject.and) {
      return evaluate(conditionObject.and, context);
    }

    const conditions = conditionObject.or;

    if (Array.isArray(conditions)) {
      return conditions.some((condition) => evaluateNode(condition, context));
    }

    return evaluate(conditions, context);
  }

  function createCondition(
    condition:
      | ConditionPredicate<context>
      | ConditionExpression<context>
      | NamedCondition<context>,
  ) {
    const namedCondition = isNamedCondition(condition) ? condition : undefined;
    const resolvedCondition = isNamedCondition(condition)
      ? condition.condition
      : condition;
    const createdCondition: CreatedCondition<context> =
      typeof resolvedCondition === 'function'
        ? resolvedCondition
        : (context) => evaluate(resolvedCondition, context);

    if (namedCondition) {
      Object.defineProperty(createdCondition, 'conditionName', {
        configurable: false,
        enumerable: false,
        value: namedCondition.name,
        writable: false,
      });
    }

    return createdCondition;
  }

  function and(
    first: ConditionNode<context>,
    ...conditions: ConditionNode<context>[]
  ): ConditionObject<context> {
    return { and: [first, ...conditions] };
  }

  function or(
    first: ConditionNode<context>,
    ...conditions: ConditionNode<context>[]
  ): ConditionObject<context> {
    return { or: [first, ...conditions] };
  }

  function compile(expression: ConditionExpression<context>) {
    return createCondition(expression);
  }

  function combine(
    first: ConditionExpression<context>,
    ...expressions: ConditionExpression<context>[]
  ): ConditionObject<context> {
    return {
      and: [normalize(first), ...expressions.map((expression) => normalize(expression))],
    };
  }

  function normalize(expression: ConditionExpression<context>): ConditionObject<context> {
    return Array.isArray(expression)
      ? { and: expression }
      : (expression as ConditionObject<context>);
  }

  return {
    and,
    combine,
    compile,
    createCondition,
    evaluate,
    normalize,
    or,
  };
}
