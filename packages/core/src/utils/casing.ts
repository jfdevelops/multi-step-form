import type { Expand, SetDefaultString } from './types';

export type CasingType = (typeof CASING_TYPES)[number];
export type ToLower<S extends string> = S extends `${infer F}${infer R}`
  ? `${Lowercase<F>}${ToLower<R>}`
  : S;

export type CapitalizeWord<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${ToLower<R>}`
  : S;
// Pascal => Capitalize each "word" chunk
type Pascalize<S extends string> = Capitalize<S>; // naive

// SnakeCase: turn spaces/hyphens into underscores, lowercase
type SnakeCase<S extends string> = Lowercase<
  S extends `${infer A} ${infer B}`
    ? `${A}_${SnakeCase<B>}`
    : S extends `${infer A}-${infer B}`
    ? `${A}_${SnakeCase<B>}`
    : S
>;

// KebabCase: same as snake but with "-"
type KebabCase<S extends string> = Lowercase<
  S extends `${infer A} ${infer B}`
    ? `${A}-${KebabCase<B>}`
    : S extends `${infer A}_${infer B}`
    ? `${A}-${KebabCase<B>}`
    : S
>;

// Flat: just strip spaces/underscores/hyphens
type RemoveDelimiters<S extends string> = S extends `${infer A} ${infer B}`
  ? `${A}${RemoveDelimiters<B>}`
  : S extends `${infer A}_${infer B}`
  ? `${A}${RemoveDelimiters<B>}`
  : S extends `${infer A}-${infer B}`
  ? `${A}${RemoveDelimiters<B>}`
  : S;

// TitleCase: Capitalize the whole thing
type TitleCase<S extends string> = Capitalize<Lowercase<S>>;

// SentenceCase: First word capped, rest lower
type SentenceCase<S extends string> = Capitalize<Lowercase<S>>;
export type ChangeCasing<
  S extends string,
  T extends CasingType
> = T extends 'lower'
  ? Lowercase<S>
  : T extends 'upper'
  ? Uppercase<S>
  : T extends 'camel'
  ? Uncapitalize<Pascalize<S>>
  : T extends 'pascal'
  ? Pascalize<S>
  : T extends 'snake'
  ? SnakeCase<S>
  : T extends 'screaming-snake'
  ? Uppercase<SnakeCase<S>>
  : T extends 'kebab'
  ? KebabCase<S>
  : T extends 'flat'
  ? RemoveDelimiters<Lowercase<S>>
  : T extends 'title'
  ? TitleCase<S>
  : T extends 'sentence'
  ? SentenceCase<S>
  : S;
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
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace separators with space
    .replace(/[-_]+/g, ' ')
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

  const isValid = CASING_TYPES.includes(value as CasingType);

  // invariant(isValid, () => {
  //   const formatter = new Intl.ListFormat('en', {
  //     style: 'long',
  //     type: 'conjunction',
  //   });

  //   return `${value} is not a valid casing type. Valid types include ${formatter.format(
  //     CASING_TYPES.map((word) => quote(word))
  //   )}`;
  // });

  return isValid;
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
