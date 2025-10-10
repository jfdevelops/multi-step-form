export namespace types {
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
  export type SetDefaultString<T extends string, Default extends T> = Default;
}
