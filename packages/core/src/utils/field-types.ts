import type { SetDefaultString } from './types';
import type { UnionToTuple } from '../steps/types';

export type FieldType = (typeof FIELD_TYPES)[number];
export type DefaultFieldType = typeof DEFAULT_FIELD_TYPE;
export type DefaultFieldTypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  date: Date;
};
export type ResolvedFieldTypeMap = {
  string: string;
  'string.phone': string;
  'string.email': string;
  'string.time': string;
  number: number;
  'number.counter': number;
  date: Date;
  dateTime: Date;
  'boolean.switch': boolean;
};
// Helper to convert a single type (non-union) to string
type BaseTypeToString<T> = T extends string
  ? 'string'
  : T extends number
  ? 'number'
  : T extends boolean
  ? 'boolean'
  : T extends Date
  ? 'date'
  : T extends object
  ? T extends Array<unknown> | Date
    ? never // Handled separately
    : 'object'
  : DefaultFieldType;

// Helper to collect union members as string literals
type UnionMembersToString<T> = T extends infer U
  ? U extends U
    ? BaseTypeToString<U>
    : never
  : never;

// Helper to join union members with |
// This manually handles the tuple conversion since UnionToTuple returns readonly
type JoinUnion<T> = UnionMembersToString<T> extends infer UnionStrings
  ? [UnionStrings] extends [string]
    ? UnionToTuple<UnionStrings> extends readonly [infer A extends string]
      ? A
      : UnionToTuple<UnionStrings> extends readonly [
          infer A extends string,
          infer B extends string
        ]
      ? `${A} | ${B}`
      : UnionToTuple<UnionStrings> extends readonly [
          infer A extends string,
          infer B extends string,
          infer C extends string
        ]
      ? `${A} | ${B} | ${C}`
      : UnionToTuple<UnionStrings> extends readonly [
          infer A extends string,
          infer B extends string,
          infer C extends string,
          infer D extends string
        ]
      ? `${A} | ${B} | ${C} | ${D}`
      : UnionStrings // Fallback for larger unions or single type
    : never
  : never;

// Helper to convert union to intersection (used to detect unions)
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

// Helper to check if T is a tuple (has specific length, not just array)
type IsTuple<T> = T extends readonly unknown[]
  ? number extends T['length']
    ? false
    : true
  : false;

// Helper to convert tuple to string representation
type TupleToString<T extends readonly unknown[]> = T extends readonly [
  infer First,
  ...infer Rest
]
  ? Rest extends readonly unknown[]
    ? `${TypeToString<First>}${Rest['length'] extends 0
        ? ''
        : `, ${TupleToString<Rest>}`}`
    : never
  : never;

// Helper type to convert a type to its string literal representation
type TypeToString<T> = T extends readonly unknown[]
  ? IsTuple<T> extends true
    ? `[${TupleToString<T>}]`
    : T extends readonly (infer U)[]
    ? [U] extends [UnionToIntersection<U>]
      ? `${TypeToString<U>}[]`
      : `(${JoinUnion<U>})[]`
    : never
  : T extends Array<infer U>
  ? [U] extends [UnionToIntersection<U>]
    ? `${TypeToString<U>}[]`
    : `(${JoinUnion<U>})[]`
  : BaseTypeToString<T>;

export type GetInferredFieldType<T extends { defaultValue: unknown }> =
  TypeToString<T['defaultValue']>;

export const FIELD_TYPES = [
  'string',
  'string.phone',
  'string.email',
  'string.time',
  'number',
  'number.counter',
  'date',
  'dateTime',
  'boolean.switch',
] as const;
export const DEFAULT_FIELD_TYPE: SetDefaultString<FieldType, 'string'> =
  'string';

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && FIELD_TYPES.includes(value as FieldType);
}

// Helper function to get the base type string for a single value (not arrays)
function getBaseTypeString(value: unknown): string {
  if (value === null) {
    return 'string';
  }

  if (typeof value === 'object') {
    return value instanceof Date ? 'date' : 'object';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  return 'string';
}

// Helper to order types according to TypeScript's union order: string | number | boolean
const TYPE_ORDER = ['string', 'number', 'boolean', 'date', 'object'] as const;

function orderTypes(types: string[]): string[] {
  return types.toSorted((a, b) => {
    const aIndex = TYPE_ORDER.indexOf(a as (typeof TYPE_ORDER)[number]);
    const bIndex = TYPE_ORDER.indexOf(b as (typeof TYPE_ORDER)[number]);
    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    }
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

// Helper to convert tuple string to union string at depth 2+
function tupleToUnion(tupleType: string): string {
  const tupleTypes = tupleType.slice(1, -1).split(', ');
  const orderedTypes = orderTypes(tupleTypes);
  return `(${orderedTypes.join(' | ')})`;
}

// Helper to process tuple format (depth < 2)
function processTuple(value: unknown[], depth: number): string {
  const elementTypes = value.map((el) => {
    if (Array.isArray(el)) {
      return getArrayTypeString(el, depth + 1);
    }
    return getBaseTypeString(el);
  });
  return `[${elementTypes.join(', ')}]`;
}

// Helper to process array-of-arrays case
function processArrayOfArrays(value: unknown[], depth: number): string {
  const arrayElementTypes = new Set<string>();
  for (const el of value) {
    if (Array.isArray(el)) {
      let innerType = getArrayTypeString(el, depth + 1);
      // At depth 2+, if inner type is a tuple, convert to union
      if (depth >= 1 && innerType.startsWith('[') && innerType.endsWith(']')) {
        innerType = tupleToUnion(innerType);
      }
      arrayElementTypes.add(innerType);
    }
  }
  if (arrayElementTypes.size === 1) {
    return `${Array.from(arrayElementTypes)[0]}[]`;
  }
  const sortedTypes = orderTypes(Array.from(arrayElementTypes));
  return `(${sortedTypes.join(' | ')})[]`;
}

// Helper to process regular array case
function processRegularArray(
  value: unknown[],
  uniqueBaseTypes: string[],
  depth: number
): string {
  const firstElement = value[0];
  let elementType: string;
  if (Array.isArray(firstElement)) {
    elementType = getArrayTypeString(firstElement, depth + 1);
    // At depth 2+, if inner type is a tuple, convert to union
    if (
      depth >= 1 &&
      elementType.startsWith('[') &&
      elementType.endsWith(']')
    ) {
      elementType = tupleToUnion(elementType);
    }
  } else {
    elementType = getBaseTypeString(firstElement);
  }

  // If we have multiple different base types, create union array
  // Use sorted order for union arrays (matches TypeScript's union order)
  if (uniqueBaseTypes.length > 1) {
    const orderedTypes = orderTypes(uniqueBaseTypes);
    return `(${orderedTypes.join(' | ')})[]`;
  }

  return `${elementType}[]`;
}

// Helper function to get the type string for an array, distinguishing tuples from regular arrays
function getArrayTypeString(value: unknown[], depth: number = 0): string {
  if (value.length === 0) {
    return 'string[]';
  }

  // Get the base type for each element (not recursively processing arrays yet)
  const elementBaseTypes = value.map(getBaseTypeString);

  // Get unique base types
  const uniqueBaseTypes = [...new Set(elementBaseTypes)];

  // Check if this has different types
  const hasDifferentTypes = uniqueBaseTypes.length > 1;

  // Heuristic: If array has different types and is small/fixed-length, treat as tuple
  // This approximates TypeScript's tuple detection (as const creates tuples)
  // At depth 0-1, use tuple format for arrays with different types
  // At depth 2+, convert to union arrays (matches TypeScript's behavior for deeply nested structures)
  if (hasDifferentTypes && depth < 2 && value.length <= 10) {
    return processTuple(value, depth);
  }

  // If all elements are arrays, process them recursively
  if (value.every(Array.isArray)) {
    return processArrayOfArrays(value, depth);
  }

  return processRegularArray(value, uniqueBaseTypes, depth);
}

type GetInferredFieldTypeReturnType<
  T extends { defaultValue: unknown },
  TType extends FieldType
> = [TType] extends [never] ? GetInferredFieldType<T> : TType;

export function getInferredFieldType<
  T extends { defaultValue: unknown },
  TType extends FieldType
>(options: T & { type: TType }): GetInferredFieldTypeReturnType<T, TType>;
export function getInferredFieldType<
  T extends { defaultValue: unknown },
  TType extends FieldType = never
>(options: T & { type?: TType }): GetInferredFieldTypeReturnType<T, TType>;
export function getInferredFieldType<
  T extends { defaultValue: unknown },
  TType extends FieldType = never
>(options: T & { type?: TType }): GetInferredFieldTypeReturnType<T, TType> {
  const { defaultValue, type } = options;

  if (type) {
    return type as unknown as GetInferredFieldTypeReturnType<T, TType>;
  }

  if (Array.isArray(defaultValue)) {
    return getArrayTypeString(defaultValue) as GetInferredFieldTypeReturnType<
      T,
      TType
    >;
  }

  if (typeof defaultValue === 'object' && defaultValue !== null) {
    if (defaultValue instanceof Date) {
      return 'date' as GetInferredFieldTypeReturnType<T, TType>;
    }
    return 'object' as GetInferredFieldTypeReturnType<T, TType>;
  }

  if (typeof defaultValue === 'number') {
    return 'number' as GetInferredFieldTypeReturnType<T, TType>;
  }

  if (typeof defaultValue === 'boolean') {
    return 'boolean' as GetInferredFieldTypeReturnType<T, TType>;
  }

  return 'string' as GetInferredFieldTypeReturnType<T, TType>;
}
