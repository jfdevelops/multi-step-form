export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
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
