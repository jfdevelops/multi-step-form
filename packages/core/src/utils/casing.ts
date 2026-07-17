import type { Expand, SetDefaultString } from './types';

export type CasingType = (typeof CASING_TYPES)[number];

type LowerChar =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';
type UpperChar = Uppercase<LowerChar>;
type IsLower<T extends string> = T extends Lowercase<T> ? true : false;
type IsUpper<T extends string> = T extends Uppercase<T> ? true : false;
type IsSnake<T extends string> = T extends `${string}_${string}` ? true : false;
type IsKebab<T extends string> = T extends `${string}-${string}` ? true : false;
type IsCamel<T extends string> = T extends `${LowerChar}${string}`
  ? T extends Capitalize<T>
    ? false
    : true
  : false;
type IsCapitalized<T extends string> = T extends `${UpperChar}${string}`
  ? true
  : false;
type IsTitle<T extends string> = IsCapitalized<
  SplitSpaces<T>[number]
> extends true
  ? true
  : false;

type IsSentence<T extends string> = SplitSpaces<T> extends [
  infer First extends string,
  ...infer Rest extends string[]
]
  ? IsCapitalized<First> extends true
    ? IsCapitalized<Rest[number]> extends false
      ? true
      : false
    : false
  : false;

type IsPascal<T extends string> = T extends Capitalize<T> ? true : false;

type DetectCasing<T extends string> = T extends `${string} ${string}`
  ? IsUpper<T> extends true
    ? 'upper'
    : IsSentence<T> extends true
    ? 'sentence'
    : IsTitle<T> extends true
    ? 'title'
    : IsLower<T> extends true
    ? 'lower'
    : IsUpper<T> extends true
    ? 'upper'
    : 'unknown'
  : IsSnake<T> extends true
  ? IsUpper<T> extends true
    ? 'screaming-snake'
    : 'snake'
  : IsKebab<T> extends true
  ? 'kebab'
  : IsCamel<T> extends true
  ? 'camel'
  : IsPascal<T> extends true
  ? 'pascal'
  : IsLower<T> extends true
  ? 'flat' | 'lower'
  : IsUpper<T> extends true
  ? 'upper'
  : 'unknown';

/* ============================================================
 * Word Normalization
 * ============================================================ */

type SplitSnake<T extends string> = T extends `${infer A}_${infer B}`
  ? [A, ...SplitSnake<B>]
  : [T];

type SplitKebab<T extends string> = T extends `${infer A}-${infer B}`
  ? [A, ...SplitKebab<B>]
  : [T];

type SplitSpaces<T extends string> = T extends `${infer A} ${infer B}`
  ? [A, ...SplitSpaces<B>]
  : [T];

type SplitCamel<
  T extends string,
  Acc extends string = ''
> = T extends `${infer C}${infer R}`
  ? C extends Lowercase<C>
    ? SplitCamel<R, `${Acc}${C}`>
    : Acc extends ''
    ? SplitCamel<R, `${Lowercase<C>}`>
    : [Acc, ...SplitCamel<R, `${Lowercase<C>}`>]
  : Acc extends ''
  ? []
  : [Acc];

type WordsFrom<T extends string> = DetectCasing<T> extends
  | 'snake'
  | 'screaming-snake'
  ? SplitSnake<Lowercase<T>>
  : DetectCasing<T> extends 'kebab'
  ? SplitKebab<Lowercase<T>>
  : DetectCasing<T> extends 'camel' | 'pascal'
  ? SplitCamel<T>
  : DetectCasing<T> extends 'sentence' | 'title' | 'lower' | 'upper'
  ? SplitSpaces<Lowercase<T>>
  : [Lowercase<T>];

type JoinCamel<T extends string[]> = T extends [
  infer H extends string,
  ...infer R extends string[]
]
  ? `${H}${Capitalize<JoinCamel<R>>}`
  : '';
type ToTitle<T extends string[]> = T extends [
  infer H extends string,
  ...infer R extends string[]
]
  ? `${Capitalize<H>}${R extends [] ? '' : ` ${ToTitle<R>}`}`
  : '';
type ToSentence<T extends string[]> = T extends [
  infer H extends string,
  ...infer R extends string[]
]
  ? `${Capitalize<H>}${R extends [] ? '' : ` ${Lowercase<JoinSpaces<R>>}`}`
  : '';

type JoinPascal<T extends string[]> = Capitalize<JoinCamel<T>>;

type JoinSnake<T extends string[]> = T extends [
  infer H extends string,
  ...infer R extends string[]
]
  ? `${H}${R extends [] ? '' : `_${JoinSnake<R>}`}`
  : '';

type JoinKebab<T extends string[]> = T extends [
  infer H extends string,
  ...infer R extends string[]
]
  ? `${H}${R extends [] ? '' : `-${JoinKebab<R>}`}`
  : '';

type JoinSpaces<T extends string[]> = T extends [
  infer H extends string,
  ...infer R extends string[]
]
  ? `${H}${R extends [] ? '' : ` ${JoinSpaces<R>}`}`
  : '';

export type ChangeCasing<
  T extends string,
  To extends CasingType
> = WordsFrom<T> extends infer W extends string[]
  ? To extends 'camel'
    ? JoinCamel<W>
    : To extends 'pascal'
    ? JoinPascal<W>
    : To extends 'snake'
    ? JoinSnake<W>
    : To extends 'screaming-snake'
    ? Uppercase<JoinSnake<W>>
    : To extends 'kebab'
    ? JoinKebab<W>
    : To extends 'lower'
    ? JoinSpaces<W>
    : To extends 'upper'
    ? Uppercase<JoinSpaces<W>>
    : To extends 'sentence'
    ? ToSentence<W>
    : To extends 'title'
    ? ToTitle<W>
    : To extends 'flat'
    ? Lowercase<JoinCamel<W>>
    : never
  : never;

export type ChangeObjectCasing<
  T extends object,
  TCasing extends CasingType
> = Expand<{
  [K in keyof T as K extends string ? ChangeCasing<K, TCasing> : K]: T[K];
}>;

export const CASING_TYPES = [
  'sentence',
  'title',
  'camel',
  'lower',
  'upper',
  'pascal',
  'snake',
  'screaming-snake',
  'flat',
  'kebab',
] as const;

export type DefaultCasing = typeof DEFAULT_CASING;
export const DEFAULT_CASING: SetDefaultString<CasingType, 'title'> = 'title';

/**
 * Changes the casing of a string according to the specified casing type.
 *
 * @param input - The string to transform.
 * @param type - The casing type to apply.
 * @returns The transformed string in the specified casing.
 */
// TODO make return type safe
export function changeCasing<TValue extends string, TType extends CasingType>(
  input: TValue,
  type: TType
): ChangeCasing<TValue, TType>;
export function changeCasing<TValue extends string, TType extends CasingType>(
  input: TValue,
  type: TType
) {
  // Step 1: Normalize to words
  const words = input
    // Replace camelCase boundaries with space
    .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
    // Replace separators with space
    .replaceAll(/[-_]+/g, ' ')
    // Trim and split into words
    .trim()
    .split(/\s+/)
    .map((w) => w.toLowerCase());

  // Step 2: Apply casing
  switch (type) {
    case 'sentence':
      return (
        words[0].charAt(0).toUpperCase() +
        words[0].slice(1) +
        (words.length > 1 ? ' ' + words.slice(1).join(' ') : '')
      );

    case 'title':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    case 'camel':
      return (
        words[0] +
        words
          .slice(1)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join('')
      );

    case 'pascal':
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');

    case 'lower':
      return words.join(' ');

    case 'upper':
      return words.join(' ').toUpperCase();

    case 'snake':
      return words.join('_');

    case 'screaming-snake':
      return words.join('_').toUpperCase();

    case 'kebab':
      return words.join('-');

    case 'flat':
      return words.join('');

    default:
      return input;
  }
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

export function isCasingValid(value: unknown): value is CasingType {
  if (typeof value !== 'string') {
    return false;
  }

  return CASING_TYPES.includes(value as CasingType);
}

/**
 * Validates {@linkcode input} is a valid {@linkcode CasingType}.
 *
 * If there is no explicit {@linkcode fallback} value provided,
 * it will default to {@linkcode DEFAULT_CASING}.
 * @param input The input to check.
 * @param fallback An optional fallback value if {@linkcode input} is `undefined`.
 * @returns The {@linkcode input} or {@linkcode fallback} if {@linkcode input} is `undefined` or an {@linkcode isCasingValid invalid} {@linkcode CasingType}.
 */
export function setCasingType<TCasing extends CasingType>(
  input: TCasing | undefined,
  fallback: CasingType = DEFAULT_CASING
) {
  if (isCasingValid(input)) {
    return input;
  }

  return fallback;
}
