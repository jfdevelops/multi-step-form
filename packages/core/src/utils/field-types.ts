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
