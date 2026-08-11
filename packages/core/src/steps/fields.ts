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
  // NOTE: intentionally not `Constrain<TCasing, CasingType>` — `Constrain`'s default third type
  // argument (`TDefault = TConstraint`) unions in the full `CasingType`, which discards whatever
  // literal casing `TCasing` was inferred to and widens every downstream label/name type to a
  // union of every possible casing transformation. `TCasing extends CasingType` is already
  // enforced by this interface's own generic constraint, so `Constrain` adds nothing here.
  nameTransformCasing?: TCasing;
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
   * If omitted, it will default to the specified casing. If {@linkcode BaseFieldOptions.isRequired}
   * is `true` and no `label` is provided, the resolved label will have a trailing `*` appended
   * (e.g. `"First Name*"`).
   *
   * If `false`, `label` will be `undefined`, meaning there won't
   * be a label for this field.
   */
  label?: string | false;
  /**
   * Placeholder text for the field.
   */
  placeholder?: string;
  /**
   * Whether the field is required.
   *
   * If `true` and no explicit `label` is provided, the resolved label will have a trailing `*`
   * appended.
   * @default false
   */
  isRequired?: boolean;
  /**
   * The default / field-level error message copy.
   */
  errorMessage?: string;
  /**
   * Consumer-defined input metadata such as `string.email` or `boolean.switch`.
   *
   * Date defaults still use the narrower date-field branch below; the broad string
   * here keeps non-date UI metadata valid during contextual step inference.
   */
  type?: string;
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
type computeCasedLabel<
  Casing extends CasingType | undefined,
  FieldKey extends string,
> = undefined extends Casing
  ? ChangeCasing<FieldKey, DefaultCasing>
  : ChangeCasing<FieldKey, Exclude<Casing, undefined>>;

export type inferLabel<
  T,
  Casing extends CasingType | undefined,
  FieldKey extends string,
> = T extends {
  label: infer label extends string | false;
}
  ? label
  : T extends { isRequired: true }
    ? `${computeCasedLabel<Casing, FieldKey>}*`
    : computeCasedLabel<Casing, FieldKey>;

type instantiateResolvedLabelProp<
  T,
  Casing extends CasingType | undefined,
  FieldKey extends string,
> = inferLabel<T, Casing, FieldKey> extends infer label
  ? [label] extends [false]
    ? {}
    : { label: label }
  : never;
export type inferIsRequired<T> = T extends {
  isRequired: infer isRequired extends boolean;
}
  ? isRequired
  : false;
type instantiateResolvedPlaceholderProp<T> = T extends {
  placeholder: string;
}
  ? { placeholder: string }
  : {};
type instantiateResolvedErrorMessageProp<T> = T extends {
  errorMessage: string;
}
  ? { errorMessage: string }
  : {};
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
            /**
             * Whether the field is required.
             */
            isRequired: inferIsRequired<T['fields'][key]>;
          } & (key extends string
            ? instantiateResolvedLabelProp<
                T['fields'][key],
                inferNameTransformCasing<T['fields'][key], TDefaultCasing>,
                key
              >
            : {}) &
            instantiateResolvedPlaceholderProp<T['fields'][key]> &
            instantiateResolvedErrorMessageProp<T['fields'][key]> &
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
export type instantiateConfig<
  TMap extends FieldConfig<CasingType> = FieldConfig<CasingType>,
> = {
  fields: TMap;
  defaultCasing?: CasingType;
  validateFields?: Constrain<unknown, AnyValidator, DefaultValidator>;
};

export function createFieldLabel(
  label: string | false | undefined,
  fieldName: string,
  casingType: CasingType,
  isRequired = false
) {
  if (label === false) {
    return undefined;
  }

  if (typeof label === 'string') {
    return label;
  }

  const casedLabel = changeCasing(fieldName, casingType);

  return isRequired ? `${casedLabel}*` : casedLabel;
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

    const { defaultValue, label, nameTransformCasing, placeholder, isRequired, errorMessage } =
      values;
    const casing = nameTransformCasing ?? defaultCasing ?? DEFAULT_CASING;
    const resolvedLabel = createFieldLabel(label, name, casing, Boolean(isRequired));
    const sharedFields = {
      nameTransformCasing: casing,
      name,
      isRequired: Boolean(isRequired),
      ...(resolvedLabel === undefined ? {} : { label: resolvedLabel }),
      ...(placeholder === undefined ? {} : { placeholder }),
      ...(errorMessage === undefined ? {} : { errorMessage }),
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

  // If placeholder is provided, it must be a string
  if ('placeholder' in field && typeof field.placeholder !== 'string') {
    return false;
  }

  // If isRequired is provided, it must be a boolean
  if ('isRequired' in field && typeof field.isRequired !== 'boolean') {
    return false;
  }

  // If errorMessage is provided, it must be a string
  if ('errorMessage' in field && typeof field.errorMessage !== 'string') {
    return false;
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
