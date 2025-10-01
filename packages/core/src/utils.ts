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

export function compareAsSets<T>(
  a: T[],
  b: T[]
): { status: 'success' } | { status: 'error'; missing: T[]; extras: T[] } {
  const setA = new Set(a);
  const setB = new Set(b);

  const missing = [...setA].filter((x) => !setB.has(x));
  const extras = [...setB].filter((x) => !setA.has(x));

  if (missing.length || extras.length) {
    return { status: 'error', missing, extras };
  }

  return { status: 'success' };
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
