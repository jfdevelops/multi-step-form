export type Expand<T> = T extends object
  ? T extends infer O
    ? O extends Function
      ? O
      : { [K in keyof O]: O[K] }
    : never
  : T;
export type Constrain<T, TConstraint, TDefault = TConstraint> =
  | (T extends TConstraint ? T : never)
  | TDefault;
export type Updater<TInput, TOutput = TInput> =
  | TOutput
  | ((input: TInput) => TOutput);
export type SetDefault<T, Defaults> = {
  // All the keys from T
  [K in keyof T]-?: K extends keyof Defaults
    ? undefined extends T[K]
      ? Exclude<T[K], undefined> | Defaults[K] // optional -> upgraded with default
      : T[K] // already required, don't touch
    : T[K];
} & {
  // Any defaults not in T get added
  [K in Exclude<keyof Defaults, keyof T>]-?: Defaults[K];
};
export type SetDefaultString<T extends string, Default extends T> = Default;
export type Range = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type ClampTo0to10<N extends number> = N extends Range
  ? N
  : // if higher than 10 → 10, if lower than 0 → 0
  number extends N
  ? never // catches the `number` type, not a literal
  : `${N}` extends `-${string}`
  ? 0
  : 10;
export type Tuple<
  N extends number,
  R extends any[] = []
> = R['length'] extends N ? R : Tuple<N, [...R, any]>;

export type GreaterThan<A extends Range, B extends Range> = Tuple<A> extends [
  ...Tuple<B>,
  ...infer _
]
  ? Tuple<B> extends [...Tuple<A>, ...infer _]
    ? false
    : true
  : false;
export type Max<T extends number[]> = T extends [
  infer A extends number,
  ...infer Rest extends number[]
]
  ? Rest['length'] extends 0
    ? ClampTo0to10<A>
    : Max<Rest> extends infer M extends Range
    ? GreaterThan<ClampTo0to10<A>, M> extends true
      ? ClampTo0to10<A>
      : M
    : never
  : never;

export type Min<T extends number[]> = T extends [
  infer A extends number,
  ...infer Rest extends number[]
]
  ? Rest['length'] extends 0
    ? ClampTo0to10<A>
    : Min<Rest> extends infer M extends Range
    ? GreaterThan<ClampTo0to10<A>, M> extends true
      ? M
      : ClampTo0to10<A>
    : never
  : never;
export type UnionToTuple<T> = (
  (T extends any ? (t: T) => T : never) extends infer U
    ? (U extends any ? (u: U) => any : never) extends (v: infer V) => any
      ? V
      : never
    : never
) extends (_: any) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];

export type Join<T extends string[], D extends string> = T extends [
  infer F extends string,
  ...infer R extends string[]
]
  ? R['length'] extends 0
    ? F
    : `${F}${D}${Join<R, D>}`
  : '';

function lazy(strings: TemplateStringsArray, ...values: any[]) {
  return () => String.raw({ raw: strings }, ...values);
}

export function invariant<T>(
  condition: T,
  message: string | (() => string),
  error: new (message: string) => Error = Error
): asserts condition {
  if (!condition) {
    const resolvedMessage =
      typeof message === 'function' ? message() : lazy`${message}`();

    throw new error(resolvedMessage);
  }
}

export function comparePartialArray<T>(
  compareArray: T[],
  actualArray: T[],
  formatter?: Intl.ListFormat
): { status: 'success' } | { status: 'error'; errors: string[] } {
  const errors: string[] = [];
  const compareSet = new Set(compareArray);
  const printedArray = formatter
    ? formatter.format(compareArray.map((value) => `${value}`))
    : `[${compareArray.join(', ')}]`;

  // Check extras: elements in b that aren't in a
  for (let i = 0; i < actualArray.length; i++) {
    const value = actualArray[i];
    if (!compareSet.has(value)) {
      errors.push(
        `Extra element at index ${i}: "${value}" is not in ${printedArray}`
      );
    }
  }

  // Check that at least one element from a is present in b
  const hasAtLeastOne = actualArray.some((v) => compareSet.has(v));
  if (!hasAtLeastOne) {
    errors.push(
      `Array must contain at least one valid element from ${printedArray}`
    );
  }

  if (errors.length > 0) {
    return { status: 'error', errors };
  }

  return { status: 'success' };
}

export function printErrors(errors: string[]) {
  return errors.map((e, i) => `❌ ${i + 1}. ${e}`).join('\n');
}

export function quote(str: string, quoteChar: '"' | "'" = '"') {
  const startsWithQuote = str.startsWith(quoteChar);
  const endsWithQuote = str.endsWith(quoteChar);

  if (startsWithQuote && endsWithQuote) {
    // Already wrapped correctly
    return str;
  }

  // If it starts or ends with a quote but not both → strip those first
  const trimmed = str.replace(/^['"]|['"]$/g, '');

  // Then add new quotes consistently
  return `${quoteChar}${trimmed}${quoteChar}`;
}
