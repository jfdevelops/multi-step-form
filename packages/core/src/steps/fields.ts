import { path } from '@/internals';
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
import { createInvariant, type Invariant } from '@/utils/invariant';
import {
  runStandardValidation,
  type AnyValidator,
  type DefaultValidator,
  type StandardSchemaValidator,
} from '@/utils/validator';
import type { AnyResolvedStep } from './types';

export namespace fields {
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
    TResolvedStep extends AnyResolvedStep,
    TStep extends keyof TResolvedStep
  > = TResolvedStep[TStep] extends {
    fields: infer fields extends object;
  }
    ? fields
    : never;
  export type get<
    TResolvedStep extends AnyResolvedStep,
    TStep extends keyof TResolvedStep,
    TFields extends getFieldsForStep<TResolvedStep, TStep> = getFieldsForStep<
      TResolvedStep,
      TStep
    >
  > = TFields;
  export type removeParentPath<T extends string> = Split<T, '.'> extends [
    infer _,
    ...infer rest
  ]
    ? rest extends string[]
      ? Join<rest, '.'>
      : never
    : never;
  export type getConfig<
    TResolvedStep extends AnyResolvedStep,
    TStep extends keyof TResolvedStep,
    TField extends getDeepFields<TResolvedStep, TStep>
  > = parentOf<TField> extends keyof get<TResolvedStep, TStep>
    ? get<TResolvedStep, TStep>[parentOf<TField>]
    : never;
  export type getDeepFields<
    TResolvedStep extends AnyResolvedStep,
    TStep extends keyof TResolvedStep = keyof TResolvedStep
  > = GetDeepFields<
    get<TResolvedStep, TStep>
  > extends infer value extends string
    ? value
    : never;

  type buildValuePath<
    TField extends string,
    TValuePropertyName extends string = 'defaultValue',
    TSplit extends Split<TField, '.'> = Split<TField, '.'>
  > = TSplit extends [infer field extends string, ...infer rest]
    ? rest extends []
      ? `${field}.${TValuePropertyName}`
      : rest extends string[]
      ? `${field}.${TValuePropertyName}.${Join<rest, '.'>}`
      : never
    : never;
  export type resolveDeepPath<
    TResolvedStep extends AnyResolvedStep,
    TStep extends keyof TResolvedStep,
    TField extends getDeepFields<TResolvedStep, TStep>,
    TValue extends get<TResolvedStep, TStep> = get<TResolvedStep, TStep>
  > = buildValuePath<TField> extends DeepKeys<TValue>
    ? path.pickBy<TValue, buildValuePath<TField>>
    : never;

  export type parentOf<T extends string> = Split<T, '.'>[0];

  // TODO add field validation
  export function resolvedDeepPath<
    resolvedStep extends AnyResolvedStep,
    targetStep extends keyof resolvedStep,
    fields extends get<resolvedStep, targetStep>,
    fieldPath extends getDeepFields<resolvedStep, targetStep>
  >(fieldPath: fieldPath, fields: fields, filler = 'defaultValue') {
    const [parent, ...children] = fieldPath.split('.');
    const shared = `${parent}.${filler}`;
    const fullPath = (
      children.length === 0 ? shared : `${shared}.${children.join('.')}`
    ) as DeepKeys<fields>;

    const resolvedValue = path.pickBy(fields, fullPath) as resolveDeepPath<
      resolvedStep,
      targetStep,
      fieldPath
    >;

    return resolvedValue;
  }

  export function buildValuePath<
    TField extends string,
    TValuePropertyName extends string = 'defaultValue',
    TSplit extends Split<TField, '.'> = Split<TField, '.'>
  >(
    field: TField,
    valuePropertyName: TValuePropertyName = 'defaultValue' as TValuePropertyName
  ) {
    const [parent, ...children] = field.split('.');

    if (children.length === 0) {
      return `${parent}.${valuePropertyName}` as buildValuePath<
        TField,
        TValuePropertyName,
        TSplit
      >;
    }

    return `${parent}.${valuePropertyName}.${children.join(
      '.'
    )}` as buildValuePath<TField, TValuePropertyName, TSplit>;
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
  export interface BaseFieldOptions<TCasing extends CasingType, TDefaultValue>
    extends NameTransformCasingOptions<TCasing> {
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
    TType extends DateFieldType
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

  export interface StringDateFieldOptions<TCasing extends CasingType>
    extends BaseDateFieldOptions<TCasing, 'string'> {
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
    TType extends DateFieldType = ResolvedDateFieldType<Date>
  > = StringDateFieldOptions<TCasing> | BaseDateFieldOptions<TCasing, TType>;
  type BaseFieldConfig<
    TCasing extends CasingType = DefaultCasing,
    TDefaultValue = unknown
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
    TDefault extends CasingType | undefined
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
    FieldKey extends string
  > = T extends {
    label: infer label extends string | false;
  }
    ? label
    : undefined extends Casing
    ? ChangeCasing<FieldKey, DefaultCasing>
    : ChangeCasing<FieldKey, Exclude<Casing, undefined>>;
  export type inferResolvedDateFieldType<T> = T extends {
    type: infer type extends DateFieldType;
  }
    ? type
    : DefaultDateFieldType;
  export type instantiateFields<
    T,
    TDefaultCasing extends CasingType = DefaultCasing
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
              ? {
                  /**
                   * The label for the field.
                   */
                  label: inferLabel<
                    T['fields'][key],
                    inferNameTransformCasing<T['fields'][key], TDefaultCasing>,
                    key
                  >;
                }
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
    return label ?? changeCasing(fieldName, casingType);
  }
  /**
   * Creates new fields for the multi step form schema.
   * @param def - The field config.
   * @returns The instantiated field config.
   */
  export function instantiate<
    const def extends instantiateConfig,
    inst = instantiateFields<def>
  >(def: def) {
    const { fields, defaultCasing, validateFields } = def;
    const invariant: Invariant = createInvariant('[instantiateFields]');

    if (defaultCasing) {
      invariant(
        typeof defaultCasing === 'string',
        `The default casing must be a string. Was ${typeof defaultCasing}`
      );
      invariant(
        isCasingValid(defaultCasing),
        (formatter) =>
          `The default casing is not a valid casing. Was ${defaultCasing}, must be one of ${formatter.format(
            CASING_TYPES
          )}`
      );
    }

    invariant(
      fields,
      'No fields were provided to the "fields" option.',
      TypeError
    );
    invariant(
      typeof fields === 'object',
      `The fields must be an object. Was ${typeof fields}`
    );
    invariant(
      Object.keys(fields).length > 0,
      `A field must be provided to the "fields" option.`
    );

    let resolvedFields: Record<string, unknown> = {};

    for (const [name, values] of Object.entries(fields)) {
      invariant(
        typeof name === 'string',
        `Each key for the "fields" option must be a string. Key ${name} was a ${typeof name}`
      );
      invariant(
        typeof values === 'object',
        `The value for key ${name} must be an object. Was ${typeof values}`
      );

      const { defaultValue, label, nameTransformCasing } = values;
      const casing = nameTransformCasing ?? defaultCasing ?? DEFAULT_CASING;
      const resolvedLabel = createFieldLabel(label, name, casing);
      const sharedFields = {
        nameTransformCasing: casing,
        name,
        label: resolvedLabel,
      };

      if (defaultValue instanceof Date) {
        const type = 'type' in values ? values.type : 'date';

        invariant(
          type === 'date' || type === 'string',
          `The type for key ${name} must be either 'date' or 'string'. Was ${type}`
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
}

export const instantiateFields = fields.instantiate;
