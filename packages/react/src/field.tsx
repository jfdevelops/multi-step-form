import type {
  AnyResolvedStep,
  fields,
  Override,
  Updater,
} from '@jfdevelops/multi-step-form-core';
import type { ReactNode } from 'react';

export namespace field {
  type sharedProps<TField extends string> = {
    /**
     * The name of the field.
     */
    name: TField;
  };

  export type childrenProps<
    TResolvedStep extends AnyResolvedStep,
    TTargetStep extends keyof TResolvedStep,
    TField extends fields.getDeep<TResolvedStep, TTargetStep>,
    TValue extends fields.resolveDeepPath<
      TResolvedStep,
      TTargetStep,
      TField
    > = fields.resolveDeepPath<TResolvedStep, TTargetStep, TField>
  > = sharedProps<TField> &
    Override<
      fields.get<TResolvedStep, TTargetStep>[fields.parentOf<TField>],
      'defaultValue',
      TValue
    > & {
      /**
       * A useful wrapper around `update` to update the specific field.
       * @param value The new value for the field.
       */
      onInputChange: (value: Updater<TValue>) => void;
      /**
       * Resets the field's value to the original value that was
       * defined in the config.
       */
      reset: () => void;
    };
  export type props<
    TResolvedStep extends AnyResolvedStep,
    TTargetStep extends keyof TResolvedStep,
    TField extends fields.getDeep<TResolvedStep, TTargetStep>
  > = sharedProps<TField> & {
    children: (
      props: childrenProps<TResolvedStep, TTargetStep, TField>
    ) => ReactNode;
  };
  export type component<
    TResolvedStep extends AnyResolvedStep,
    TTargetStep extends keyof TResolvedStep
  > = <TField extends fields.getDeep<TResolvedStep, TTargetStep>>(
    props: props<TResolvedStep, TTargetStep, TField>
  ) => ReactNode;

  /**
   * Create a field.
   * @param propsCreator
   * @returns
   */
  export function create<
    TResolvedStep extends AnyResolvedStep,
    TTargetStep extends keyof TResolvedStep
  >(
    propsCreator: <TField extends fields.getDeep<TResolvedStep, TTargetStep>>(
      name: TField
    ) => field.childrenProps<TResolvedStep, TTargetStep, TField>
  ) {
    const Field: field.component<TResolvedStep, TTargetStep> = (props) => {
      const { children, name } = props;
      const createdProps = propsCreator(name);

      return children(createdProps);
    };

    return Field;
  }
}
