import { path } from '@/internals';
import { InvalidFieldConfigError } from '@/errors/invalid-field-config';
import { InvalidStepError } from '@/errors/invalid-step';
import {
  CASING_TYPES,
  changeCasing,
  DEFAULT_CASING,
  isCasingValid,
  type CasingType,
  type ChangeCasing,
  type Constrain,
  type DeepKeys,
  type DefaultCasing,
  type Expand,
  type Join,
  type SetDefaultString,
  type Split,
} from '@/utils';
import {
  runStandardValidation,
  type AnyValidator,
  type DefaultValidator,
  type StandardSchemaValidator,
} from '@/utils/validator';
import type { instantiateSteps, StepNumbers } from './steps';

type GetDeepFields<TFields> = [keyof TFields] extends [never]
  ? never
  : {
      [_ in keyof TFields]: TFields[_] extends Record<
        'defaultValue',
        infer value
      >
        ? keyof value extends never
          ? TFields
          : DeepKeys<{ [field in _]: TFields[_]['defaultValue'] }>
        : never;
    }[keyof TFields];
export type getFieldsForStep<
  values extends instantiateSteps,
  step extends StepNumbers<values>,
> = values[step] extends {
  fields: infer fields extends object;
}
  ? fields
  : never;
export type getFieldForStep<
  values extends instantiateSteps,
  step extends StepNumbers<values>,
> = getFieldsForStep<values, step>;
export type removeParentPath<T extends string> =
  Split<T, '.'> extends [infer _, ...infer rest]
    ? rest extends string[]
      ? Join<rest, '.'>
      : never
    : never;
export type getFieldConfig<
  values extends instantiateSteps,
  step extends StepNumbers<values>,
  field extends getDeepFields<values, step>,
> =
  parentOf<field> extends keyof getFieldForStep<values, step>
    ? getFieldForStep<values, step>[parentOf<field>]
    : never;
export type getDeepFields<
  values extends instantiateSteps,
  step extends StepNumbers<values>,
> =
  GetDeepFields<getFieldForStep<values, step>> extends infer value extends string
    ? value
    : never;

type buildValuePath<
  field extends string,
  valuePropertyName extends string = 'defaultValue',
  split extends Split<field, '.'> = Split<field, '.'>,
> = split extends [infer field extends string, ...infer rest]
  ? rest extends []
    ? `${field}.${valuePropertyName}`
    : rest extends string[]
      ? `${field}.${valuePropertyName}.${Join<rest, '.'>}`
      : never
  : never;
export type resolveDeepFieldPath<
  values extends instantiateSteps,
  step extends StepNumbers<values>,
  field extends getDeepFields<values, step>,
  value extends getFieldForStep<values, step> = getFieldForStep<values, step>,
> =
  buildValuePath<field> extends DeepKeys<value>
    ? path.pickBy<value, buildValuePath<field>>
    : never;
export type getDefaultValues<
  values extends instantiateSteps,
  targetStep extends StepNumbers<values>,
  fields extends getFieldForStep<values, targetStep> = getFieldForStep<values, targetStep>,
> = {
  -readonly [key in keyof fields]: fields[key] extends {
    defaultValue: infer defaultValue;
  }
    ? defaultValue
    : never;
  };
export function getDefaultValues<
  values extends instantiateSteps,
  targetStep extends StepNumbers<values>,
  fields extends getFieldForStep<values, targetStep> = getFieldForStep<values, targetStep>,
  >(values: values, targetStep: targetStep) {
  InvalidStepError.invariant(
    targetStep in values,
    {
      reason: `The target step ${targetStep} is not a valid step key`,
      targetStep,
      validSteps: Object.keys(values),
    },
  );

  const current = values[targetStep];

  InvalidStepError.invariant(
    typeof current === 'object' && current !== null,
    {
      reason: `The target step ${targetStep} is not an object`,
      targetStep,
    },
  );
  InvalidStepError.invariant('fields' in current, {
    reason: `No "fields" were found for ${targetStep}`,
    targetStep,
  });

  let defaultValues = {};

  for (const [fieldName, fieldValues] of Object.entries(
    current.fields as Record<string, Record<string, unknown>>
  )) {
    defaultValues = {
      ...defaultValues,
      [fieldName]: fieldValues.defaultValue,
    };
  }

  return defaultValues as Expand<getDefaultValues<values, targetStep>>;
}
export type parentOf<T extends string> = Split<T, '.'>[0];

// TODO add field validation
export function resolvedDeepPath<
  values extends instantiateSteps,
  step extends StepNumbers<values>,
  fields extends getFieldForStep<values, step>,
  fieldPath extends getDeepFields<values, step>,
>(fieldPath: fieldPath, fields: fields, filler = 'defaultValue') {
  const [parent, ...children] = fieldPath.split('.');
  const shared = `${parent}.${filler}`;
  const fullPath = (
    children.length === 0 ? shared : `${shared}.${children.join('.')}`
  ) as DeepKeys<fields>;

  const resolvedValue = path.pickBy(fields, fullPath) as resolveDeepFieldPath<
    values,
    step,
    fieldPath
  >;

  return resolvedValue;
}

export function buildValuePath<
  field extends string,
  valuePropertyName extends string = 'defaultValue',
  split extends Split<field, '.'> = Split<field, '.'>,
>(
  field: field,
  valuePropertyName: valuePropertyName = 'defaultValue' as valuePropertyName
) {
  const [parent, ...children] = field.split('.');

  if (children.length === 0) {
    return `${parent}.${valuePropertyName}` as buildValuePath<
      field,
      valuePropertyName,
      split
    >;
  }

  return `${parent}.${valuePropertyName}.${children.join(
    '.'
  )}` as buildValuePath<field, valuePropertyName, split>;
}

export type DateFieldTypeMap = {
  date: Date;
  string: string;
};
export type DateFieldType = keyof DateFieldTypeMap;
export type DefaultDateFieldType = SetDefaultString<DateFieldType, 'date'>;
export interface NameTransformCasingOptions<TCasing extends CasingType> {
  /**
   * How the `name` should be transformed for the `label`.
   *
   * If omitted, the default will be whatever is set during {@linkcode MultiStepFormSchema} initialization.
   */
  nameTransformCasing?: Constrain<TCasing, CasingType>;
}
export interface BaseFieldOptions<
  TCasing extends CasingType,
  TDefaultValue,
> extends NameTransformCasingOptions<TCasing> {
  /**
   * The default value for the field.
   */
  defaultValue: TDefaultValue;
  /**
   * The text for the label.
   *
   * If omitted, it will default to the specified casing.
   *
   * If `false`, `label` will be `undefined`, meaning there won't
   * be a label for this field.
   */
  label?: string | false;
}

export interface BaseDateFieldOptions<
  TCasing extends CasingType,
  TType extends DateFieldType,
> extends BaseFieldOptions<TCasing, Date> {
  /**
   * The type of the resolved field value. It can either be a `date` or a `string`.
   *
   * - `date`: The field value will be a `date` object.
   * - `string`: The field value will be a `string`. If `transform` is provided, it will be used to transform the date value to a string.
   *
   * @default 'date'
   */
  type?: TType;
}

export interface StringDateFieldOptions<
  TCasing extends CasingType,
> extends BaseDateFieldOptions<TCasing, 'string'> {
  type: 'string';
  /**
   * A function to transform the date value to the desired type.
   *
   * If omitted, the date will be transformed to a `string` using the default `Date.toISOString` method.
   *
   * @param value The {@linkcode Date} value to transform.
   * @returns The transformed value.
   */
  transform?: (value: Date) => string;
}

export type ResolvedDateFieldType<T> = T extends Date ? DateFieldType : never;
export type DateFieldConfig<
  TCasing extends CasingType = DefaultCasing,
  TType extends DateFieldType = ResolvedDateFieldType<Date>,
> = StringDateFieldOptions<TCasing> | BaseDateFieldOptions<TCasing, TType>;
type BaseFieldConfig<
  TCasing extends CasingType = DefaultCasing,
  TDefaultValue = unknown,
> = BaseFieldOptions<TCasing, TDefaultValue>;
export type FieldConfig<TCasing extends CasingType = DefaultCasing> = Record<
  string,
  BaseFieldConfig<TCasing> | DateFieldConfig<TCasing>
>;

type InferDefaultValue<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends true
      ? boolean
      : T extends false
        ? boolean
        : T extends object
          ? T extends Date
            ? Date
            : T extends ReadonlyArray<infer item>
              ? Array<InferDefaultValue<item>>
              : { -readonly [key in keyof T]: InferDefaultValue<T[key]> }
          : never;

export type inferDefaultValue<T> = T extends {
  defaultValue: infer defaultValue;
}
  ? InferDefaultValue<defaultValue>
  : never;
export type inferNameTransformCasing<
  T,
  TDefault extends CasingType | undefined,
> = T extends {
  nameTransformCasing: infer nameTransformCasing extends CasingType;
}
  ? nameTransformCasing
  : undefined extends TDefault
    ? DefaultCasing
    : TDefault;
export type inferLabel<
  T,
  Casing extends CasingType | undefined,
  FieldKey extends string,
> = T extends {
  label: infer label extends string | false;
}
  ? label
  : undefined extends Casing
    ? ChangeCasing<FieldKey, DefaultCasing>
    : ChangeCasing<FieldKey, Exclude<Casing, undefined>>;

type instantiateResolvedLabelProp<
  T,
  Casing extends CasingType | undefined,
  FieldKey extends string,
> = inferLabel<T, Casing, FieldKey> extends infer label
  ? [label] extends [false]
    ? {}
    : { label: label }
  : never;
export type inferResolvedDateFieldType<T> = T extends {
  type: infer type extends DateFieldType;
}
  ? type
  : DefaultDateFieldType;
export type instantiateFields<
  T,
  TDefaultCasing extends CasingType = DefaultCasing,
> = [T] extends [object]
  ? T extends instantiateConfig
    ? {
        -readonly [key in keyof T['fields']]: Expand<
          {
            /**
             * The default value for the field.
             */
            defaultValue: inferDefaultValue<T['fields'][key]>;
            /**
             * The casing of the field name.
             */
            nameTransformCasing: inferNameTransformCasing<
              T['fields'][key],
              TDefaultCasing
            >;
            /**
             * The name of the field.
             */
            name: key;
          } & (key extends string
            ? instantiateResolvedLabelProp<
                T['fields'][key],
                inferNameTransformCasing<T['fields'][key], TDefaultCasing>,
                key
              >
            : {}) &
            (inferDefaultValue<T['fields'][key]> extends Date
              ? /**
                 * The type of the field.
                 */
                { type: inferResolvedDateFieldType<T['fields'][key]> }
              : {})
        >;
      }
    : never
  : never;
export type instantiateConfig<TMap extends FieldConfig = FieldConfig> = {
  fields: TMap;
  defaultCasing?: CasingType;
  validateFields?: Constrain<unknown, AnyValidator, DefaultValidator>;
};

export function createFieldLabel(
  label: string | false | undefined,
  fieldName: string,
  casingType: CasingType
) {
  if (label === false) {
    return undefined;
  }

  return label ?? changeCasing(fieldName, casingType);
}
/**
 * Creates new fields for the multi step form schema.
 * @param def - The field config.
 * @returns The instantiated field config.
 */
export function instantiateFields<
  const def extends instantiateConfig,
  inst = instantiateFields<def>,
>(def: def) {
  const { fields, defaultCasing, validateFields } = def;
  if (defaultCasing) {
    InvalidFieldConfigError.invariant(
      typeof defaultCasing === 'string',
      {
        reason: `The default casing must be a string. Was ${typeof defaultCasing}`,
        value: defaultCasing,
        expected: 'string',
      },
    );
    InvalidFieldConfigError.invariant(
      isCasingValid(defaultCasing),
      {
        reason: `The default casing is not valid. Was ${defaultCasing}`,
        value: defaultCasing,
        expected: CASING_TYPES,
      },
    );
  }

  InvalidFieldConfigError.invariant(
    fields,
    {
      reason: 'No fields were provided to the "fields" option.',
      expected: 'non-empty object',
    },
  );
  InvalidFieldConfigError.invariant(
    typeof fields === 'object',
    {
      reason: `The fields must be an object. Was ${typeof fields}`,
      value: fields,
      expected: 'object',
    },
  );
  InvalidFieldConfigError.invariant(
    Object.keys(fields).length > 0,
    {
      reason: 'A field must be provided to the "fields" option.',
      value: fields,
      expected: 'non-empty object',
    },
  );

  let resolvedFields: Record<string, unknown> = {};

  for (const [name, values] of Object.entries(fields)) {
    InvalidFieldConfigError.invariant(
      typeof name === 'string',
      {
        reason: `Each key for the "fields" option must be a string. Key ${name} was a ${typeof name}`,
        field: name,
        value: name,
        expected: 'string',
      },
    );
    InvalidFieldConfigError.invariant(
      typeof values === 'object',
      {
        reason: `The value for key ${name} must be an object. Was ${typeof values}`,
        field: name,
        value: values,
        expected: 'object',
      },
    );

    const { defaultValue, label, nameTransformCasing } = values;
    const casing = nameTransformCasing ?? defaultCasing ?? DEFAULT_CASING;
    const resolvedLabel = createFieldLabel(label, name, casing);
    const sharedFields = {
      nameTransformCasing: casing,
      name,
      ...(resolvedLabel === undefined ? {} : { label: resolvedLabel }),
    };

    if (defaultValue instanceof Date) {
      const type = 'type' in values ? values.type : 'date';

      InvalidFieldConfigError.invariant(
        type === 'date' || type === 'string',
        {
          reason: `The type for key ${name} must be either 'date' or 'string'. Was ${type}`,
          field: name,
          value: type,
          expected: ['date', 'string'],
        },
      );
      const resolvedValue =
        type === 'date' ? defaultValue : JSON.stringify(defaultValue);

      resolvedFields[name] = {
        ...(resolvedFields[name] as Record<string, unknown>),
        ...sharedFields,
        defaultValue: resolvedValue,
        type,
      };
    } else {
      resolvedFields[name] = {
        ...(resolvedFields[name] as Record<string, unknown>),
        ...sharedFields,
        defaultValue,
      };
    }
  }

  if (validateFields) {
    const defaultValues = Object.fromEntries(
      Object.entries(resolvedFields).map(([name, value]) => [
        name,
        (value as Record<string, unknown>).defaultValue,
      ])
    );

    runStandardValidation(
      validateFields as StandardSchemaValidator,
      defaultValues
    );
  }

  return resolvedFields as inst;
}

function isValidFieldValue(field: Record<string, unknown>): boolean {
  // Must have defaultValue
  if (!('defaultValue' in field)) {
    return false;
  }

  // If label is provided, it must be a string or false
  if ('label' in field) {
    const label = field.label;
    if (label !== false && typeof label !== 'string') {
      return false;
    }
  }

  // If nameTransformCasing is provided, it must be a valid casing
  if ('nameTransformCasing' in field) {
    const casing = field.nameTransformCasing;
    if (typeof casing !== 'string' || !isCasingValid(casing)) {
      return false;
    }
  }

  // If defaultValue is a Date, validate type field
  if (field.defaultValue instanceof Date) {
    if ('type' in field) {
      const type = field.type;
      if (type !== 'date' && type !== 'string') {
        return false;
      }
    }
  }

  return true;
}

export function isValidFieldConfig(value: unknown): value is FieldConfig {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const fields = value as Record<string, unknown>;

  // Check if fields has at least one key
  if (Object.keys(fields).length === 0) {
    return false;
  }

  // Validate each field
  for (const [name, fieldValue] of Object.entries(fields)) {
    // Each key must be a string
    if (typeof name !== 'string') {
      return false;
    }

    // Each value must be an object
    if (fieldValue === null || typeof fieldValue !== 'object') {
      return false;
    }

    if (!isValidFieldValue(fieldValue as Record<string, unknown>)) {
      return false;
    }
  }

  return true;
}
