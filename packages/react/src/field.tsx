import type {
  AnyResolvedStep,
  fields,
  Override,
  Updater,
} from '@jfdevelops/multi-step-form-core';
import type { ReactNode } from 'react';
import { memo, useSyncExternalStore } from 'react';

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
   * @param subscribe - Optional subscription function for reactivity
   * @param getValue - Optional function to get the current field value reactively
   * @returns
   */
  export function create<
    TResolvedStep extends AnyResolvedStep,
    TTargetStep extends keyof TResolvedStep
  >(
    propsCreator: <TField extends fields.getDeep<TResolvedStep, TTargetStep>>(
      name: TField
    ) => field.childrenProps<TResolvedStep, TTargetStep, TField>,
    subscribe?: (listener: () => void) => () => void,
    getValue?: <TField extends fields.getDeep<TResolvedStep, TTargetStep>>(
      name: TField
    ) => fields.resolveDeepPath<TResolvedStep, TTargetStep, TField>
  ) {
    const Field: field.component<TResolvedStep, TTargetStep> = memo(
      (props) => {
        const { children, name } = props;

        // Always call the hook, but use no-op functions if subscribe/getValue aren't provided
        const subscribeFn = subscribe || (() => () => {});
        const getValueFn = getValue || (() => undefined);

        // Subscribe to changes to trigger rerenders
        const currentValue = useSyncExternalStore(
          subscribeFn,
          () => getValueFn(name),
          () => getValueFn(name)
        );

        let createdProps = propsCreator(name);

        // If getValue is provided, override defaultValue with the reactive value
        if (getValue) {
          createdProps = {
            ...createdProps,
            defaultValue: currentValue,
          } as typeof createdProps;
        }

        return children(createdProps);
      },
      // Custom comparison: only compare the `name` prop
      // The `children` function will always be a new reference, but that's okay
      // because we only re-render when the field value changes (via useSyncExternalStore)
      // or when the `name` prop changes
      (prevProps, nextProps) => prevProps.name === nextProps.name
    );

    return Field;
  }
}
