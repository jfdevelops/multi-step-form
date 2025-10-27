export type Expand<T> = T extends object
  ? T extends infer O
    ? O extends Function
      ? O
      : {
          [K in keyof O]: O[K];
        }
    : never
  : T;
export type Constrain<T, TConstraint, TDefault = TConstraint> =
  | (T extends TConstraint ? T : never)
  | TDefault;
export type SetDefaultString<T extends string, Default extends T> = Default;
type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export type Override<T extends object, TKey extends keyof T, TData> = Prettify<
  {
    [K in keyof T as K extends TKey ? never : K]: T[K];
  } & {
    [K in TKey as {} extends Pick<T, K> ? K : never]?: TData;
  } & {
    [K in TKey as {} extends Pick<T, K> ? never : K]: TData;
  }
>;