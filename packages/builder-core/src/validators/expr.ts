/**
 * Dual expressions: values that are evaluated and written as source code at the same time.
 *
 * Wrapping a library module (`z`, `v`, `type`…) in an expression lets an adapter write ordinary
 * library code once. Every property access and call runs on the real library *and* appends to
 * the recorded source, so the runtime validator and the exported code can never drift apart.
 */

const EXPR = Symbol.for('@jfdevelops/multi-step-form-builder/expr');
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

interface ExprData {
  value: unknown;
  code: string;
  /** The receiver for calls, so methods keep their `this`. */
  receiver?: unknown;
  /** Runs the first time the expression is used (e.g. to record an import). */
  onUse?: () => void;
}

function exprData(value: unknown): ExprData | undefined {
  return (typeof value === 'function' || (typeof value === 'object' && value !== null))
    ? ((value as Record<symbol, unknown>)[EXPR] as ExprData | undefined)
    : undefined;
}

/** Whether `value` is a dual expression. */
export function isExpr(value: unknown) {
  return exprData(value) !== undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

/**
 * The runtime value behind an expression, recursing into plain arrays and objects. Expressions
 * are typed as their runtime value, so the type is unchanged.
 */
export function unwrapExpr<T>(value: T): T {
  const data = exprData(value);

  if (data) return data.value as T;
  if (Array.isArray(value)) return value.map(unwrapExpr) as T;
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, unwrapExpr(item)])) as T;
  }

  return value;
}

function indent(text: string, spaces = 2) {
  const pad = ' '.repeat(spaces);

  return text
    .split('\n')
    .map((line, index) => (index === 0 ? line : pad + line))
    .join('\n');
}

function propertyKey(key: string) {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

/** Source code for a value: expressions print their code, plain data prints as literals. */
export function printExpr(value: unknown): string {
  const data = exprData(value);

  if (data) return data.code;
  if (value === undefined) return 'undefined';
  if (value instanceof RegExp) return String(value);
  if (value instanceof Date) return `new Date(${JSON.stringify(value.toISOString())})`;
  if (typeof value === 'function') {
    throw new TypeError(
      'Functions passed to a library must be created with ctx.fn(runtime, code) so they can be written as source code.',
    );
  }

  if (Array.isArray(value)) {
    const items = value.map(printExpr);
    const inline = `[${items.join(', ')}]`;

    return inline.length <= 72 && !inline.includes('\n')
      ? inline
      : `[\n${items.map((item) => `  ${indent(item)},`).join('\n')}\n]`;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).map(([key, item]) => `${propertyKey(key)}: ${indent(printExpr(item))}`);

    if (entries.length === 0) return '{}';

    const inline = `{ ${entries.join(', ')} }`;

    return inline.length <= 72 && !inline.includes('\n')
      ? inline
      : `{\n${entries.map((entry) => `  ${entry},`).join('\n')}\n}`;
  }

  return JSON.stringify(value);
}

function printArgs(args: readonly unknown[]) {
  // Trailing `undefined` arguments are the same as leaving them out.
  let count = args.length;

  while (count > 0 && args[count - 1] === undefined) count--;

  const printed = args.slice(0, count).map(printExpr);
  const inline = printed.join(', ');

  return inline.includes('\n') && printed.length > 1
    ? `\n${printed.map((arg) => `  ${indent(arg)},`).join('\n')}\n`
    : inline;
}

function makeExpr(data: ExprData): object {
  // A function target, so the proxy can be called and constructed.
  const target = function () {};

  return new Proxy(target, {
    get(_target, property) {
      if (property === EXPR) return data;
      // Keep expressions from being mistaken for promises.
      if (property === 'then') return undefined;
      if (typeof property === 'symbol') return (data.value as Record<symbol, unknown>)?.[property];

      data.onUse?.();

      const owner = data.value as Record<string, unknown>;
      const code = IDENTIFIER.test(property)
        ? `${data.code}.${property}`
        : `${data.code}[${JSON.stringify(property)}]`;

      return makeExpr({ value: owner[property], code, receiver: owner });
    },
    apply(_target, _this, args: unknown[]) {
      data.onUse?.();

      const value = Reflect.apply(data.value as (...args: unknown[]) => unknown, data.receiver, args.map(unwrapExpr));

      return makeExpr({ value, code: `${data.code}(${printArgs(args)})` });
    },
    construct(_target, args: unknown[]) {
      data.onUse?.();

      const value = Reflect.construct(data.value as new (...args: unknown[]) => object, args.map(unwrapExpr));

      return makeExpr({ value, code: `new ${data.code}(${printArgs(args)})` });
    },
  });
}

/**
 * Creates a dual expression from a runtime value and the code that produces it. Use it for
 * values a library can't construct for you, such as callbacks:
 *
 * ```ts
 * createExpr((value: string) => value.trim() !== '', "(value) => value.trim() !== ''")
 * ```
 */
export function createExpr<T>(value: T, code: string, onUse?: () => void): T {
  return makeExpr({ value, code, onUse }) as T;
}
