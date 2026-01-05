import type {
  AnyResolvedStep,
  Expand,
  fields,
  HelperFnChosenSteps,
  HelperFnCtx,
  Override,
  StepNumbers,
  UpdateFn,
  Updater,
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

  // aliases for types in `fields` namespace
  type getDeep<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  > = fields.getDeep<
    TResolvedStep,
    HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TChosenSteps>
  >;
  type resolveDeepPath<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TField extends getDeep<TResolvedStep, TSteps, TChosenSteps>
  > = fields.resolveDeepPath<
    TResolvedStep,
    HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TChosenSteps>,
    TField
  >;
  type get<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  > = fields.get<
    TResolvedStep,
    HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TChosenSteps>
  >;
  export type onInputChangeOptions<
    TStrict extends boolean,
    TPartial extends boolean
  > = UpdateFn.ModeOptions<{
    strict: TStrict;
    partial: TPartial;
  }> &
    UpdateFn.DebugOptions;

  export type childrenProps<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TField extends getDeep<TResolvedStep, TSteps, TChosenSteps>,
    TValue extends resolveDeepPath<
      TResolvedStep,
      TSteps,
      TChosenSteps,
      TField
    > = resolveDeepPath<TResolvedStep, TSteps, TChosenSteps, TField>
  > = sharedProps<TField> &
    Override<
      get<TResolvedStep, TSteps, TChosenSteps>[fields.parentOf<TField>],
      'defaultValue',
      TValue
    > & {
      /**
       * A useful wrapper around `update` to update the specific field.
       * @param value The new value for the field.
       * @param options The options for the update operation.
       */
      onInputChange: <
        strict extends boolean = true,
        partial extends boolean = false
      >(
        value: Updater<
          UpdateFn.resolvedUpdaterReturnType<
            TValue,
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
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TField extends getDeep<TResolvedStep, TSteps, TChosenSteps>,
    TSelected
  > = childrenProps<TResolvedStep, TSteps, TChosenSteps, TField> & {
    selected: {
      /**
       * The result of the `selectorFn`.
       */
      value: TSelected;
    };
  };
  export type props<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TField extends getDeep<TResolvedStep, TSteps, TChosenSteps>,
    TSelected
  > = sharedProps<TField> & {
    selectorFn?: SelectorFn<TResolvedStep, TSteps, TChosenSteps, TSelected>;
    children: (
      props: [TSelected] extends [never]
        ? childrenProps<TResolvedStep, TSteps, TChosenSteps, TField>
        : childrenPropsWithSelected<
            TResolvedStep,
            TSteps,
            TChosenSteps,
            TField,
            TSelected
          >
    ) => ReactNode;
  };
  export type component<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  > = <
    field extends fields.getDeep<
      TResolvedStep,
      HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TChosenSteps>
    >,
    selected = never
  >(
    props: props<TResolvedStep, TSteps, TChosenSteps, field, selected>
  ) => ReactNode;

  export type createOptions<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  > = {
    propsCreator: <TField extends getDeep<TResolvedStep, TSteps, TChosenSteps>>(
      name: TField
    ) => field.childrenProps<TResolvedStep, TSteps, TChosenSteps, TField>;
    subscribe?: (listener: () => void) => () => void;
    getValue?: <TField extends getDeep<TResolvedStep, TSteps, TChosenSteps>>(
      name: TField
    ) => resolveDeepPath<TResolvedStep, TSteps, TChosenSteps, TField>;
    selectorCtx: Expand<HelperFnCtx<TResolvedStep, TSteps, TChosenSteps>>;
  };

  /**
   * Create a field.
   * @param propsCreator
   * @param subscribe - Optional subscription function for reactivity
   * @param getValue - Optional function to get the current field value reactively
   * @returns
   */
  export function create<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  >(options: createOptions<TResolvedStep, TSteps, TChosenSteps>) {
    const { propsCreator, subscribe, getValue, selectorCtx } = options;

    const Field: field.component<TResolvedStep, TSteps, TChosenSteps> = (
      props
    ) => {
      const { name, children, selectorFn } = props;

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

      if (selectorFn) {
        const Selector = selector.create<TResolvedStep, TSteps, TChosenSteps>(
          () => selectorCtx,
          subscribeFn
        );

        return (
          <Selector selector={selectorFn}>
            {(value) =>
              children({
                ...createdProps,
                selected: { value: value as never },
              })
            }
          </Selector>
        );
      }

      return children(createdProps as never);
    };

    return memo(Field);
  }
}
