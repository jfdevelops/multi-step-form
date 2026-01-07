import { path } from '@/internals';
import type { DeepKeys, Join, Split } from '@/utils';
import type { AnyResolvedStep, AnyStepField, GetFieldsForStep } from './types';

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

  type resolvedStep = {
    step3: {
      title: string;
      type: 'string';
      nameTransformCasing: 'title';
      fields: {
        theme: {
          defaultValue: string;
          label: string;
          type: 'string';
          nameTransformCasing: 'title';
        };
        preferences: {
          defaultValue: {
            notifications: boolean;
            fontSize: string;
            colorScheme: string;
          };
          label: string;
          type: 'object';
          nameTransformCasing: 'title';
        };
        newsLetterOptIn: {
          type: 'boolean.switch';
          label: string;
          nameTransformCasing: 'title';
          defaultValue: boolean;
        };
      };
    };
  };
  // export type resolveDeepPath<
  //   TResolvedStep extends AnyResolvedStep,
  //   TTargetStep extends keyof TResolvedStep,
  //   TField extends getDeepFields<TResolvedStep, TTargetStep>,
  //   TDefaultValue extends getDeepValue<TResolvedStep, TTargetStep, TField> = getDeepValue<TResolvedStep, TTargetStep, TField>
  // > = removeParentPath<TField> extends never
  //   ? TDefaultValue
  //   : path.pickBy<TDefaultValue, removeParentPath<TField>>;

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
}
