import type { DeepKeys, unionHelpers } from './types';

export namespace path {
  type getBy<T, TPath extends string> = TPath extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? getBy<T[K], Rest>
      : never
    : TPath extends keyof T
    ? T[TPath]
    : never;

  type buildFromPath<T, P extends string> = P extends `${infer K}.${infer Rest}`
    ? { [Key in K]: buildFromPath<getBy<T, K>, Rest> }
    : P extends keyof T
    ? { [Key in P]: T[P] }
    : never;

  /**
   * Does P have any ancestor path in All? (i.e. some Q in All such that Q is a
   * strict prefix of P)
   */
  type hasAncestor<P extends string, All extends string> = true extends (
    All extends string
      ? All extends P
        ? false // same path, not an ancestor
        : P extends `${All}.${string}`
        ? true
        : false
      : never
  )
    ? true
    : false;

  /**
   * Normalize a union of paths by removing those that have an ancestor path
   * also in the union.
   *
   * Example:
   *   NormalizePaths<'foo.bar.baz' | 'foo.bar'> -> 'foo.bar'
   *   NormalizePaths<'foo.bar' | 'other'>       -> 'foo.bar' | 'other'
   */
  type normalize<
    Paths extends string,
    All extends string = Paths
  > = Paths extends string
    ? hasAncestor<Paths, All> extends true
      ? never
      : Paths
    : never;

  // helper to distribute BuildFromPath over union
  type distributeAndBuild<T, Paths extends string> = Paths extends unknown
    ? buildFromPath<T, Paths>
    : never;

  export type generateObjectConfig<T> = {
    [K in keyof T]: T[K] extends object
      ? // K's value is an object: allow stopping at K, or going deeper
        { [P in K]: true } | { [P in K]: generateObjectConfig<T[K]> }
      : // K's value is not object: can only stop at K
        { [P in K]: true };
  }[keyof T];
  export type objectToPath<O> = {
    [K in keyof O]: O[K] extends true
      ? K & string
      : O[K] extends object
      ? `${K & string}.${objectToPath<O[K]>}`
      : never;
  }[keyof O];

  /**
   * Pick by paths:
   *   - Normalize the paths (remove descendants when parent also present)
   *   - If only one normalized path:
   *       return GetByPath<T, P> (relative type)
   *   - If multiple:
   *       intersect root-built shapes for each normalized path
   *
   * @example
   * ```ts
   * type User = {
   *   foo: {
   *     bar: {
   *       baz: number;
   *       qux: string;
   *     };
   *   };
   *   other: string;
   * };
   *
   * type Test1 = PickByPaths<User, 'foo.bar'>;
   * // { baz: number; qux: string }          ✅ relative object at foo.bar
   *
   * type Test2 = PickByPaths<User, 'foo.bar.baz'>;
   * // number                               ✅ leaf type
   *
   * type Test3 = PickByPaths<User, 'foo.bar' | 'other'>;
   * // { foo: { bar: { baz: number; qux: string } } } & { other: string } ✅
   *
   * type Test4 = PickByPaths<User, 'foo.bar.baz' | 'foo.bar' | 'other'>;
   * // { baz: number; qux: string }          ✅ parent 'foo.bar' wins, relative
   * ```
   */
  export type pickBy<
    T,
    Paths extends DeepKeys<T>
  > = normalize<Paths> extends infer normalized extends string
    ? unionHelpers.is<normalized> extends true
      ? unionHelpers.toIntersection<distributeAndBuild<T, normalized>>
      : getBy<T, normalized>
    : never;

  function getBy(obj: any, path: string): any {
    return path
      .split('.')
      .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }
  export function setBy<
    def extends Record<string, unknown>,
    path extends DeepKeys<def>
  >(target: def, path: path, value: unknown) {
    const keys = path.split('.');
    let current = target;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (i === keys.length - 1) {
        // last key -> assign/merge
        if (
          current[k] !== undefined &&
          typeof current[k] === 'object' &&
          typeof value === 'object' &&
          value !== null
        ) {
          Object.assign(current[k] as Record<string, unknown>, value);
        } else {
          (current[k] as any) = value;
        }
      } else {
        if (typeof current[k] !== 'object' || current[k] === null) {
          (current[k] as any) = {};
        }
        (current as any) = current[k];
      }
    }

    return current;
  }

  // Runtime: normalize paths (drop descendants when ancestor exists)
  export function normalizePaths(...paths: string[]) {
    // Sort by depth (deepest first), so longer paths come before their parents.
    const sorted = [...paths].sort(
      (a, b) => b.split('.').length - a.split('.').length
    );

    const finalPaths: string[] = [];

    for (const path of sorted) {
      // If the path is contained inside another selected deeper path, skip it
      const isCovered = finalPaths.some((p) => p.startsWith(path + '.'));

      if (!isCovered) {
        finalPaths.push(path);
      }
    }

    // The order may not matter, but returning in shallow-to-deep order feels natural.
    return finalPaths.reverse();
  }

  /**
   * pickByPaths:
   *  - paths can be a union of string literals
   *  - return type is PickByPaths<T, Paths>
   */
  export function pickBy<def, paths extends DeepKeys<def>>(
    obj: def,
    ...paths: paths[]
  ): pickBy<def, paths> {
    const norm = normalizePaths(...paths);

    // Single normalized path -> return relative value at that path
    if (norm.length === 1) {
      return getBy(obj, norm[0]) as pickBy<def, paths>;
    }

    // Multiple normalized paths -> build root-based object and intersect
    const result: Record<string, unknown> = {};

    for (const p of norm) {
      const value = getBy(obj, p);

      setBy(result, p, value);
    }

    return result as pickBy<def, paths>;
  }

  /**
   * Creates an array of all deep paths in an object.
   * Recursively traverses the object and returns all possible dot-separated paths.
   *
   * @example
   * ```ts
   * const obj = {
   *   foo: {
   *     bar: {
   *       baz: 1,
   *       qux: 2
   *     }
   *   },
   *   other: 'value'
   * };
   *
   * createPaths(obj);
   * // ['foo', 'foo.bar', 'foo.bar.baz', 'foo.bar.qux', 'other']
   * ```
   */
  export function createDeep<T>(obj: T): DeepKeys<T>[] {
    const paths: string[] = [];

    function traverse(current: any, prefix: string = ''): void {
      if (current === null || current === undefined) {
        return;
      }

      if (typeof current !== 'object' || Array.isArray(current)) {
        return;
      }

      const keys = Object.keys(current);
      for (const key of keys) {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.push(path);

        const value = current[key];
        if (
          value !== null &&
          value !== undefined &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          traverse(value, path);
        }
      }
    }

    traverse(obj);
    return paths as DeepKeys<T>[];
  }

  export type MismatchReason =
    | 'value-mismatch'
    | 'type-mismatch'
    | 'missing-key'
    | 'extra-key';
  export interface Mismatch {
    path: string;
    expected: unknown;
    actual: unknown;
    reason: MismatchReason;
  }

  export interface CompareResult {
    ok: boolean;
    mismatches: Mismatch[];
  }
  type ExpectedTransformFn<TValue = unknown> = (
    value: TValue,
    path: string
  ) => unknown;
  /**
   * Transform config:
   * - a single function: applies to the whole T
   * - or an object shaped like T, where values are either:
   *    - functions (apply at/under that node)
   *    - nested objects continuing the shape
   */
  export type ExpectedTransformConfig<T, V = unknown> =
    | ExpectedTransformFn<V>
    | { [K in keyof T]?: ExpectedTransformConfig<T[K], T[K]> };
  export interface EqualsOptions<T> {
    /**
     * How to transform the "expected" field in mismatches.
     * If omitted, a default type-ish formatting is used.
     */
    transformExpected?: ExpectedTransformConfig<T>;
  }
  interface DeepCompareOptions<T> {
    includeValueMismatch?: boolean;

    transformExpected?: ExpectedTransformConfig<T>;
  }

  function defaultExpectedFormat(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'Array';
    const t = typeof value;
    if (t !== 'object') return t; // 'string', 'number', etc.
    const ctor = (value as any)?.constructor?.name;
    return ctor && ctor !== 'Object' ? ctor : 'object';
  }

  function splitPath(path: string): string[] {
    if (!path) return [];
    const parts: string[] = [];
    const regex = /[^.[\]]+|\[(\d+)\]/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(path))) {
      parts.push(m[1] ?? m[0]);
    }
    return parts;
  }

  function getTransformFunction<T>(
    root: ExpectedTransformConfig<T> | undefined,
    path: string
  ): ExpectedTransformFn | undefined {
    if (!root) return undefined;

    if (typeof root === 'function') {
      // TS now knows this is ExpectedTransformFn, but we can be explicit:
      return root as ExpectedTransformFn;
    }

    const segments = splitPath(path);
    let node: any = root;
    let lastFn: ExpectedTransformFn | undefined;

    for (const seg of segments) {
      if (!node) break;

      if (typeof node === 'function') {
        lastFn = node as ExpectedTransformFn;
        break;
      }

      node = node[seg];

      if (typeof node === 'function') {
        lastFn = node as ExpectedTransformFn;
        break;
      }
    }

    return lastFn;
  }

  function formatExpected<T>(
    rawExpected: unknown,
    path: string,
    cfg: ExpectedTransformConfig<T> | undefined
  ): unknown {
    const fn = getTransformFunction(cfg, path);
    if (fn) return fn(rawExpected, path);
    return defaultExpectedFormat(rawExpected);
  }

  function isObjectLike(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null;
  }

  function deepCompare<T>(
    expected: unknown,
    actual: unknown,
    basePath: string,
    mismatches: Mismatch[],
    options: DeepCompareOptions<T>
  ): Mismatch[] {
    // identical (covers primitives + same-ref objects)
    if (expected === actual) {
      return mismatches;
    }

    // one is null/undefined OR types not object-like -> primitive / scalar mismatch
    if (
      expected === null ||
      actual === null ||
      typeof expected !== 'object' ||
      typeof actual !== 'object'
    ) {
      const path = basePath || '(root)';

      if (typeof expected !== typeof actual) {
        mismatches.push({
          path,
          expected: formatExpected(expected, path, options.transformExpected),
          actual,
          reason: 'type-mismatch',
        });
        return mismatches;
      }

      if (options.includeValueMismatch) {
        mismatches.push({
          path,
          expected: formatExpected(expected, path, options.transformExpected),
          actual,
          reason: 'value-mismatch',
        });
      }

      return mismatches;
    }

    // arrays
    if (Array.isArray(expected) || Array.isArray(actual)) {
      if (!Array.isArray(expected) || !Array.isArray(actual)) {
        const path = basePath || '(root)';
        mismatches.push({
          path,
          expected: formatExpected(expected, path, options.transformExpected),
          actual,
          reason: 'type-mismatch',
        });
        return mismatches;
      }

      // Both values are arrays.
      // We *do* compare element structure/types where both have an index, but we
      // intentionally ignore length differences (no missing/extra index errors).
      const maxLen = expected.length;

      for (let i = 0; i < maxLen; i++) {
        const expVal = expected[i];
        const actVal = actual[i];
        const path = basePath === '' ? `[${i}]` : `${basePath}[${i}]`;

        deepCompare(expVal, actVal, path, mismatches, options);
      }

      return mismatches;
    }

    // plain objects
    if (isObjectLike(expected) && isObjectLike(actual)) {
      const expKeys = Object.keys(expected);
      const actKeys = Object.keys(actual);

      for (const key of expKeys) {
        const expVal = (expected as any)[key];
        const actVal = (actual as any)[key];
        const path = basePath ? `${basePath}.${key}` : key;

        if (!(key in actual)) {
          mismatches.push({
            path,
            expected: formatExpected(expVal, path, options.transformExpected),
            actual: undefined,
            reason: 'missing-key',
          });
          continue;
        }

        deepCompare(expVal, actVal, path, mismatches, options);
      }

      for (const key of actKeys) {
        if (!(key in expected)) {
          const path = basePath ? `${basePath}.${key}` : key;
          mismatches.push({
            path,
            expected: undefined,
            actual: (actual as any)[key],
            reason: 'extra-key',
          });
        }
      }

      return mismatches;
    }

    const path = basePath || '(root)';
    if (typeof expected !== typeof actual) {
      mismatches.push({
        path,
        expected: formatExpected(expected, path, options.transformExpected),
        actual,
        reason: 'type-mismatch',
      });
    } else if (options.includeValueMismatch) {
      mismatches.push({
        path,
        expected: formatExpected(expected, path, options.transformExpected),
        actual,
        reason: 'value-mismatch',
      });
    }

    return mismatches;
  }

  export function equalsAtPaths<def, paths extends DeepKeys<def>>(
    obj: def,
    paths: paths[],
    actual: pickBy<def, paths>,
    options?: EqualsOptions<def>
  ): CompareResult {
    // expected comes from obj at the given paths
    const expected = pickBy<def, paths>(obj, ...paths);

    const mismatches: Mismatch[] = [];

    const basePath = paths.length === 1 ? (paths[0] as string) : '';

    deepCompare<def>(expected, actual, basePath, mismatches, {
      transformExpected: options?.transformExpected,
    });

    return {
      ok: mismatches.length === 0,
      mismatches,
    };
  }

  function formatValue(v: unknown): string {
    if (v === undefined) return 'undefined';
    if (typeof v === 'string') return JSON.stringify(v); // add quotes
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }

  function formatReason(m: Mismatch): string {
    switch (m.reason) {
      case 'missing-key':
        return 'Missing key';
      case 'extra-key':
        return 'Extra key';
      case 'type-mismatch':
        return 'Type mismatch';
      case 'value-mismatch':
        return 'Value mismatch';
      default:
        return m.reason;
    }
  }

  /**
   * Turn a CompareResult into a pretty error string.
   */
  export function formatMismatches(result: CompareResult) {
    if (result.ok || result.mismatches.length === 0) {
      return 'No mismatches.';
    }

    const lines: string[] = [];

    for (const m of result.mismatches) {
      lines.push(
        `\n● ${formatReason(m)} at "${m.path}":`,
        `    expected: ${formatValue(m.expected)}`,
        `    actual:   ${formatValue(m.actual)}`,
        '' // blank line between entries
      );
    }

    // trim trailing blank line
    if (lines.at(-1) === '') {
      lines.pop();
    }

    return lines.join('\n');
  }

  /**
   * Convenience: log to console.error.
   */
  export function printMismatches(result: CompareResult): void {
    const msg = formatMismatches(result);
    if (msg !== 'No mismatches.') {
      console.error(msg);
    }
  }

  function setAtImmutable<
    T extends Record<string, unknown>,
    path extends DeepKeys<T>
  >(root: T, path: path, value: pickBy<T, path>) {
    const keys = path.split('.');

    function helper(current: T, idx: number): any {
      const key = keys[idx];
      const resolvedCurrent = Array.isArray(current)
        ? [...current]
        : { ...current };

      if (idx === keys.length - 1) {
        let clone =
          current && typeof current === 'object' ? resolvedCurrent : {};

        clone = {
          ...clone,
          [key]: value,
        };

        return clone;
      }

      const next =
        current && typeof current === 'object' ? current[key] : undefined;

      const updatedChild = helper((next as T) ?? ({} as T), idx + 1);

      let clone = current && typeof current === 'object' ? resolvedCurrent : {};

      clone = {
        ...clone,
        [key]: updatedChild,
      };

      return clone;
    }

    return helper(root, 0);
  }

  export function findMissingPaths<
    obj extends Record<string, unknown>,
    path extends DeepKeys<obj>
  >(obj: obj, paths: Array<path>, actual: pickBy<obj, path>) {
    const keys: string[] = [];

    for (const path of paths) {
      const value = pickBy(obj, path);
      const expectedKeys = createDeep(value);
      const actualKeys = createDeep(actual);
      const missingKeys = expectedKeys
        .filter((key) => !actualKeys.includes(key))
        .map((key) => `${path}.${key}`);

      keys.push(...missingKeys);
    }

    return keys as Array<DeepKeys<obj>>;
  }

  export type updateAtOptions<
    T extends Record<string, unknown>,
    path extends DeepKeys<T>
  > = {
    obj: T;
    paths: Array<path>;
    value: pickBy<T, path>;
    partial?: boolean;
  };

  function getPathThatMatter(path: string) {
    // Only works when updating a `defaultValue`
    // TODO make this work with the entire object - will need to figure out some way to normalize
    const [, ...rest] = path.split('.defaultValue.');

    return rest.join('.');
  }
  function getPathsThatMatter(paths: Array<string>) {
    return paths.map(getPathThatMatter);
  }

  export function joinAtPath<
    obj extends Record<string, unknown>,
    path extends DeepKeys<obj>
  >(paths: Array<path>, obj: obj, value: pickBy<obj, path>) {
    if (paths.length === 1) {
      const [path] = paths;
      const missingData = pickBy(obj, ...paths);
      const setPath = getPathThatMatter(path);

      // if (last) {
      //   const data = setBy(
      //     value as Record<string, unknown>,
      //     last,
      //     missingData
      //   ) as pickBy<obj, path>;

      //   return data;
      // }

      const data = setBy(
        value as Record<string, unknown>,
        setPath,
        missingData
      ) as pickBy<obj, path>;

      return data;
    }

    if (paths.length > 1) {
      let resolvedValue = {} as Record<string, unknown>;

      for (const path of paths) {
        const pathThatMatters = getPathThatMatter(path);
        const missing = joinAtPath([path], obj, value);
        const valueAtPathThatMatters = getBy(obj, path);

        // This check is here to ensure `resolvedValue` will only have
        // nested properties where they belong.
        if (
          Object.keys(resolvedValue).length > 0 &&
          valueAtPathThatMatters !== 'undefined'
        ) {
          const dataAtPath = pickBy(obj, path);
          const [key] = pathThatMatters.split('.');

          if (typeof dataAtPath === 'object') {
            if (missing) {
              resolvedValue = {
                ...resolvedValue,
                [key]: {
                  ...(resolvedValue[key] as Record<string, unknown>),
                  ...missing,
                },
              };
            }
          }

          continue;
        }

        if (missing) {
          resolvedValue = {
            ...resolvedValue,
            ...missing,
          };
        }
      }

      return resolvedValue as pickBy<obj, path>;
    }
  }

  export function updateAt<
    obj extends Record<string, unknown>,
    path extends DeepKeys<obj>
  >(options: updateAtOptions<obj, path>) {
    const { obj, partial, paths, value } = options;
    const norm = normalizePaths(...paths);
    if (norm.length === 0) return obj;

    let result = obj;
    let resolvedValue = value;

    if (partial) {
      const missingPaths = findMissingPaths(obj, paths, value);

      const missingData = joinAtPath(
        missingPaths as Array<path>,
        obj,
        resolvedValue
      );

      resolvedValue = {
        ...(resolvedValue as Record<string, unknown>),
        ...(missingData as Record<string, unknown>),
      } as pickBy<obj, path>;
    }

    if (norm.length === 1) {
      // single path: value is relative at that path
      const path = norm[0] as DeepKeys<obj>;

      result = setAtImmutable(result, path, resolvedValue as never);

      return result;
    }

    // multiple paths:
    // value is the root-shaped object that contains all those paths
    for (const path of norm) {
      const sub = getBy(value, path);

      result = setAtImmutable(result, path as DeepKeys<obj>, sub);
    }

    return result;
  }
}
