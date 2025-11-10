import type {
  AnyResolvedStep,
  StepNumbers,
  Updater,
  ValidStepKey,
} from '@multi-step-form/core';
import type { ReactNode } from 'react';

export namespace Field {
  export type getFields<
    TResolvedStep extends AnyResolvedStep,
    TTargetStep extends StepNumbers<TResolvedStep>
  > = TResolvedStep[ValidStepKey<TTargetStep>]['fields'];
  export type childrenProps<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends TStepNumbers,
    TFields extends getFields<TResolvedStep, TTargetStep>,
    TField extends keyof TFields
  > = getFields<TResolvedStep, TTargetStep>[TField] & {
    /**
     * The name of the field.
     */
    name: TField;
    /**
     * A useful wrapper around `update` to update the specific field.
     * @param value The new value for the field.
     */
    onInputChange: (value: Updater<TFields[TField]['defaultValue']>) => void;
  };
  export type props<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends TStepNumbers,
    TFields extends getFields<TResolvedStep, TTargetStep>,
    TField extends keyof TFields
  > = {
    name: TField;
    children: (
      props: childrenProps<
        TResolvedStep,
        TStepNumbers,
        TTargetStep,
        TFields,
        TField
      >
    ) => ReactNode;
  };
  export type component<
    TResolvedStep extends AnyResolvedStep,
    TStepNumbers extends StepNumbers<TResolvedStep>,
    TTargetStep extends TStepNumbers
  > = <
    TFields extends getFields<TResolvedStep, TTargetStep>,
    TField extends keyof TFields
  >(
    props: props<TResolvedStep, TStepNumbers, TTargetStep, TFields, TField>
  ) => ReactNode;
}

export function createField<
  TResolvedStep extends AnyResolvedStep,
  TStepNumbers extends StepNumbers<TResolvedStep>,
  TTargetStep extends TStepNumbers
>(
  propsCreator: <
    TFields extends Field.getFields<TResolvedStep, TTargetStep>,
    TField extends keyof TFields
  >(
    name: TField
  ) => Field.childrenProps<
    TResolvedStep,
    TStepNumbers,
    TTargetStep,
    TFields,
    TField
  >
) {
  function Field<
    TFields extends Field.getFields<TResolvedStep, TTargetStep>,
    TField extends keyof TFields
  >(
    props: Field.props<
      TResolvedStep,
      TStepNumbers,
      TTargetStep,
      TFields,
      TField
    >
  ) {
    const { children, name } = props;

    return children(propsCreator(name));
  }

  return Field;
}
