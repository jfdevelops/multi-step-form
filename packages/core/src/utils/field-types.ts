import type { SetDefaultString } from './types';

export type FieldType = (typeof FIELD_TYPES)[number];
export type DefaultFieldType = typeof DEFAULT_FIELD_TYPE;
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
