import type {
  AnyResolvedStep,
  Constrain,
  DeepKeys,
  GetFieldsForStep,
  Join,
  Override,
  Split,
  Updater
} from '@jfdevelops/multi-step-form';
import type { path } from '@jfdevelops/multi-step-form/_internal';
import type { ReactNode } from 'react';

export namespace Field {
  type GetDeepFields<TFields> = keyof TFields extends never
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
  export type getDeepFields<
    TResolvedStep extends AnyResolvedStep,
    TStep extends keyof TResolvedStep,
    TFields = GetDeepFields<getFields<TResolvedStep, TStep>>
  > = Constrain<
    TFields extends never ? GetFieldsForStep<TResolvedStep, TStep> : TFields,
    string
  >;
  export type getFields<
    TResolvedStep extends AnyResolvedStep,
    TStep extends keyof TResolvedStep,
    TFields extends GetFieldsForStep<TResolvedStep, TStep> = GetFieldsForStep<
      TResolvedStep,
      TStep
    >
  > = TFields;
  type sharedProps<TField extends string> = {
    /**
     * The name of the field.
     */
    name: TField;
  };
  type removeParentPath<T extends string> = Split<T, '.'> extends [
    infer _,
    ...infer rest
  ]
    ? rest extends string[]
      ? Join<rest, '.'>
      : never
    : never;
  type onInputChange<T> = {
    /**
     * A useful wrapper around `update` to update the specific field.
     * @param value The new value for the field.
     */
    onInputChange: (value: Updater<T>) => void;
  };

  export type childrenProps<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends keyof TResolvedStep,
    TTargetStep extends TSteps,
    TField extends getDeepFields<TResolvedStep, TSteps>,
    TParentPath extends string = Constrain<
      Split<TField, '.'>[0],
      string,
      Split<TField, '.'>[0]
    >,
    TFields extends getFields<
      TResolvedStep,
      TTargetStep
    >[TParentPath] = GetFieldsForStep<TResolvedStep, TTargetStep>[TParentPath],
    TDefaultValue = TFields['defaultValue']
  > = sharedProps<TField> &
    (removeParentPath<TField> extends never
      ? // Only parent field
        onInputChange<TDefaultValue> & TFields
      : // Deep keys
        onInputChange<path.pickBy<TDefaultValue, removeParentPath<TField>>> &
          Override<
            TFields,
            'defaultValue',
            {
              defaultValue: path.pickBy<
                TDefaultValue,
                removeParentPath<TField>
              >;
            }
          >);
  export type props<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends keyof TResolvedStep,
    TTargetStep extends TSteps,
    // TFields extends getFields<TResolvedStep, TTargetStep>,
    TField extends getDeepFields<TResolvedStep, TSteps>
  > = sharedProps<TField> & {
    children: (
      props: childrenProps<TResolvedStep, TSteps, TTargetStep, TField>
    ) => ReactNode;
  };
  export type component<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends keyof TResolvedStep,
    TTargetStep extends TStepNumbers
  > = <TField extends getDeepFields<TResolvedStep, TStepNumbers>>(
    props: props<TResolvedStep, TStepNumbers, TTargetStep, TField>
  ) => ReactNode;
}

export function createField<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends keyof TResolvedStep,
  TTargetStep extends TSteps
>(
  propsCreator: <
    TField extends Field.getDeepFields<TResolvedStep, TTargetStep>
  >(
    name: TField
  ) => Field.childrenProps<TResolvedStep, TSteps, TTargetStep, TField>
) {
  const Field: Field.component<TResolvedStep, TSteps, TTargetStep> = (
    props
  ) => {
    const { children, name } = props;
    const createdProps = propsCreator(name);

    return children(createdProps);
  };

  return Field;
}
