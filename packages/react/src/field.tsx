import type {
  AnyResolvedStep,
  CurrentStepHelperFnCtx,
  Expand,
  fields,
  Override,
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
  // type getDeep<
  //   TResolvedStep extends AnyResolvedStep,
  //   TSteps extends StepNumbers<TResolvedStep>,
  //   TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  // > = fields.getDeep<
  //   TResolvedStep,
  //   HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TChosenSteps>
  // >;
  // type resolveDeepPath<
  //   TResolvedStep extends AnyResolvedStep,
  //   TSteps extends StepNumbers<TResolvedStep>,
  //   TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  //   TField extends getDeep<TResolvedStep, TSteps, TChosenSteps>
  // > = fields.resolveDeepPath<
  //   TResolvedStep,
  //   HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TChosenSteps>,
  //   TField
  // >;
  // type get<
  //   TResolvedStep extends AnyResolvedStep,
  //   TSteps extends StepNumbers<TResolvedStep>,
  //   TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  // > = fields.get<
  //   TResolvedStep,
  //   HelperFnChosenSteps.resolve<TResolvedStep, TSteps, TChosenSteps>
  // >;
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
    // TSteps extends StepNumbers<TResolvedStep>,
    // TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TField extends fields.getDeepFields<TResolvedStep>,
    TValue extends fields.resolveDeepPath<
      TResolvedStep,
      keyof TResolvedStep,
      TField
    > = fields.resolveDeepPath<TResolvedStep, keyof TResolvedStep, TField>,
    TConfig extends fields.getConfig<
      TResolvedStep,
      keyof TResolvedStep,
      TField
    > = fields.getConfig<TResolvedStep, keyof TResolvedStep, TField>
  > = sharedProps<TField> &
    (TConfig extends { defaultValue: unknown }
      ? Override<TConfig, 'defaultValue', TValue>
      : {
          defaultValue: `An unknown error occurred while getting the "defaultValue" for ${TField}`;
        }) & {
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
    // TSteps extends StepNumbers<TResolvedStep>,
    // TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TField extends fields.getDeepFields<TResolvedStep>,
    TSelected
  > = childrenProps<TResolvedStep, TField> & {
    selected: {
      /**
       * The result of the `selectorFn`.
       */
      value: TSelected;
    };
  };
  export type props<
    TCurrentStep extends AnyResolvedStep,
    // TSteps extends StepNumbers<TCurrentStep>,
    // TChosenSteps extends HelperFnChosenSteps<TCurrentStep, TSteps>,
    // TField extends getDeep<TCurrentStep, TSteps, TChosenSteps>,
    TField extends fields.getDeepFields<TCurrentStep, keyof TCurrentStep>,
    TSelected
  > = sharedProps<TField> & {
    selectorFn?: SelectorFn<TCurrentStep, TSelected>;
    children: (
      props: [TSelected] extends [never]
        ? childrenProps<TCurrentStep, TField>
        : childrenPropsWithSelected<TCurrentStep, TField, TSelected>
    ) => ReactNode;
  };
  export type component<
    TCurrentStep extends AnyResolvedStep
    // TSteps extends StepNumbers<TCurrentStep>,
    // TChosenSteps extends HelperFnChosenSteps<TCurrentStep, TSteps>
  > = <
    field extends fields.getDeepFields<
      TCurrentStep,
      keyof TCurrentStep
      // HelperFnChosenSteps.resolve<TCurrentStep, TSteps, TChosenSteps>
    >,
    selected = never
  >(
    props: props<TCurrentStep, field, selected>
  ) => ReactNode;

  export type createOptions<
    TCurrentStep extends AnyResolvedStep
    // TSteps extends StepNumbers<TResolvedStep>,
    // TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  > = {
    propsCreator: <TField extends fields.getDeepFields<TCurrentStep>>(
      name: TField
    ) => field.childrenProps<TCurrentStep, TField>;
    subscribe?: (listener: () => void) => () => void;
    getValue?: <TField extends fields.getDeepFields<TCurrentStep>>(
      name: TField
    ) => fields.resolveDeepPath<TCurrentStep, keyof TCurrentStep, TField>;
    selectorCtx: Expand<CurrentStepHelperFnCtx<TCurrentStep>>;
  };

  /**
   * Create a field.
   * @param propsCreator
   * @param subscribe - Optional subscription function for reactivity
   * @param getValue - Optional function to get the current field value reactively
   * @returns
   */
  export function create<
    TCurrentStep extends AnyResolvedStep
    // TSteps extends StepNumbers<TCurrentStep>,
    // TChosenSteps extends HelperFnChosenSteps<TCurrentStep, TSteps>
  >(options: createOptions<TCurrentStep>) {
    const { propsCreator, subscribe, getValue, selectorCtx } = options;

    const Field: field.component<TCurrentStep> = (props) => {
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
        } as never;
      }

      if (selectorFn) {
        const Selector = selector.create<TCurrentStep>(
          () => selectorCtx,
          subscribeFn
        );

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
