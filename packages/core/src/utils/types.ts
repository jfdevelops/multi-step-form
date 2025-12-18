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
export type Split<
  S extends string,
  Delimiter extends string
> = S extends `${infer First}${Delimiter}${infer Rest}`
  ? [First, ...Split<Rest, Delimiter>]
  : [S];

export type Join<T extends string[], Delimiter extends string> = T extends [
  infer First extends string
]
  ? First
  : T extends [infer First extends string, ...infer Rest extends string[]]
  ? `${First}${Delimiter}${Join<Rest, Delimiter>}`
  : never;

export namespace unionHelpers {
  /**
   * Checks if `T` is a union.
   */
  export type is<T, U = T> = (
    T extends unknown ? (k: T) => void : never
  ) extends (k: infer I) => void
    ? [U] extends [I]
      ? false
      : true
    : never;
  export type toIntersection<U> = (
    U extends any ? (x: U) => void : never
  ) extends (x: infer I) => void
    ? I
    : never;
}

export namespace objectHelpers {
  // `true` if T is a non-array, non-function object
  export type isObject<T> = T extends object
    ? T extends any[] // exclude arrays
      ? false
      : T extends Function // optionally exclude functions
      ? false
      : true
    : false;
}

export type DeepKeys<T> = T extends object
  ? T extends readonly any[] | Date
    ? never
    : {
        [K in keyof T & string]:
          | K
          | (T[K] extends object
              ? T[K] extends readonly any[] | Date
                ? never
                : `${K}.${DeepKeys<T[K]>}`
              : never);
      }[keyof T & string]
  : never;

// Resolve a deep path (dot-separated) to its nested value type
export type DeepValue<
  T,
  Path extends string
> = Path extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepValue<T[K], Rest>
    : never
  : Path extends keyof T
  ? T[Path]
  : never;
type Builtin =
  | Date
  | Function
  | Error
  | RegExp
  | symbol
  | bigint
  | string
  | number
  | boolean
  | undefined
  | null
  | Map<unknown, unknown>
  | Set<unknown>
  | WeakMap<object, unknown>
  | WeakSet<object>
  | Array<unknown>
  | Promise<unknown>;

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;
