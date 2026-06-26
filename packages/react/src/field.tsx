import type {
  Expand,
  getDeepFields,
  getFieldConfig,
  HelperFn,
  instantiateSteps,
  Override,
  resolveDeepFieldPath,
  StepNumbers,
  UpdateFn,
  Updater
} from '@jfdevelops/multi-step-form-core';
import type { ReactNode } from 'react';
import { memo, useSyncExternalStore } from 'react';
import type { SelectorFn } from './hooks/use-selector';
import { selector } from './selector';

export namespace field {
  type sharedProps<TField extends string> = {
    /**
     * The name of the field.
     */
    name: TField;
  };

  export type onInputChangeOptions<
    TStrict extends boolean,
    TPartial extends boolean,
  > = UpdateFn.ModeOptions<{
    strict: TStrict;
    partial: TPartial;
  }> &
    UpdateFn.DebugOptions;

  type normalizeChildrenConfig<TConfig, TValue> =
    TConfig extends { defaultValue: unknown }
      ? Override<TConfig, 'defaultValue', TValue> extends infer resolvedConfig
        ? resolvedConfig extends { label: false }
          ? Omit<resolvedConfig, 'label'>
          : resolvedConfig
        : never
      : never;

  export type childrenProps<
    steps extends instantiateSteps,
    field extends getDeepFields<steps, targetStep>,
    targetStep extends StepNumbers<steps> = StepNumbers<steps>,
    value extends resolveDeepFieldPath<steps, targetStep, field> =
    resolveDeepFieldPath<steps, targetStep, field>,
    TConfig extends getFieldConfig<steps, targetStep, field> =
    getFieldConfig<steps, targetStep, field>,
  > = sharedProps<field> &
    (TConfig extends { defaultValue: unknown }
      ? normalizeChildrenConfig<TConfig, value>
      : {
        defaultValue: `An unknown error occurred while getting the "defaultValue" for ${field}`;
      }) & {
        /**
         * A useful wrapper around `update` to update the specific field.
         * @param value The new value for the field.
         * @param options The options for the update operation.
         */
        onInputChange: <
          strict extends boolean = true,
          partial extends boolean = false,
        >(
          value: Updater<
            UpdateFn.resolvedUpdaterReturnType<
              value,
              { strict: strict; partial: partial },
              {}
            >
          >,
          options?: onInputChangeOptions<strict, partial>
        ) => void;
        /**
         * Resets the field's value to the original value that was
         * defined in the config.
         */
        reset: (options?: UpdateFn.DebugOptions) => void;
      };

  export type childrenPropsWithSelected<
    steps extends instantiateSteps,
    field extends getDeepFields<steps, StepNumbers<steps>>,
    TSelected,
  > = childrenProps<steps, field> & {
    selected: {
      /**
       * The result of the `selectorFn`.
       */
      value: TSelected;
    };
  };
  export type props<
    step extends instantiateSteps,
    field extends getDeepFields<step, StepNumbers<step>>,
    selected,
  > = sharedProps<field> & {
    selectorFn?: SelectorFn<step, selected>;
    children: (
      props: [selected] extends [never]
        ? childrenProps<step, field>
        : childrenPropsWithSelected<step, field, selected>
    ) => ReactNode;
  };
  export type component<steps extends instantiateSteps> = <
    field extends getDeepFields<steps, StepNumbers<steps>>,
    selected = never,
  >(
    props: props<steps, field, selected>
  ) => ReactNode;

  export type createOptions<step extends instantiateSteps> = {
    propsCreator: <
        field extends getDeepFields<step, StepNumbers<step>>,
    >(
      name: field
    ) => field.childrenProps<step, field>;
    subscribe?: (listener: () => void) => () => void;
    getValue?: <
      field extends getDeepFields<step, StepNumbers<step>>,
    >(
      name: field
    ) => resolveDeepFieldPath<step, StepNumbers<step>, field>;
    selectorCtx: () => Expand<HelperFn.buildCtx<step, [StepNumbers<step>]>>;
  };

  /**
   * Create a field.
   * @param propsCreator
   * @param subscribe - Optional subscription function for reactivity
   * @param getValue - Optional function to get the current field value reactively
   * @returns
   */
  export function create<step extends instantiateSteps>(
    options: createOptions<step>
  ) {
    const { propsCreator, subscribe, getValue, selectorCtx } = options;

    const Field: field.component<step> = (props) => {
      const { name, children, selectorFn } = props;

      // Always call the hook, but use no-op functions if subscribe/getValue aren't provided
      const subscribeFn = subscribe || (() => () => { });
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
        } as never;
      }

      if (selectorFn) {
        const Selector = selector.create<step>(selectorCtx, subscribeFn);

        return (
          <Selector selector={selectorFn}>
            {(value) =>
              children({
                ...createdProps,
                selected: { value: value as never },
              } as never)
            }
          </Selector>
        );
      }

      return children(createdProps as never);
    };

    return memo(Field);
  }
}
