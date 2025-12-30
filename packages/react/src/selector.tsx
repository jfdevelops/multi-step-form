import {
  AnyResolvedStep,
  StepNumbers,
  HelperFnChosenSteps,
  Expand,
  HelperFnCtx,
} from '@jfdevelops/multi-step-form-core';
import { createUseSelector, SelectorFn } from './hooks/use-selector';
import { Fragment } from 'react/jsx-runtime';
import { createElement, memo } from 'react';

export namespace selector {
  export type props<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
    TSelected
  > = {
    selector: SelectorFn<TResolvedStep, TSteps, TChosenSteps, TSelected>;
    children?: (selected: TSelected) => React.ReactNode;
  };
  export type component<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  > =
    /**
     * A component for reactively displaying a value from the form context.
     * Unlike `useSelector`, this component only re-renders itself, not the parent component.
     * Use this when you want to display a reactive value without causing parent re-renders.
     *
     * @param selector - A function that receives the current step's context and returns the selected value
     * @param children - Optional render prop that receives the selected value
     *
     * @example
     * <Selector selector={(ctx) => ctx.step1.fields.firstName.defaultValue}>
     *   {(value) => <p>First name: {value}</p>}
     * </Selector>
     */
    <TSelected>(
      props: props<TResolvedStep, TSteps, TChosenSteps, TSelected>
    ) => React.ReactNode;

  export function create<
    TResolvedStep extends AnyResolvedStep,
    TSteps extends StepNumbers<TResolvedStep>,
    TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
  >(
    createCtx: () => Expand<HelperFnCtx<TResolvedStep, TSteps, TChosenSteps>>,
    subscribe: (listener: () => void) => () => void
  ) {
    const useSelector = createUseSelector(createCtx, subscribe);
    const Selector: component<TResolvedStep, TSteps, TChosenSteps> = ({
      selector,
      children,
    }) => {
      const selected = useSelector(selector);

      if (children) {
        return createElement(Fragment, null, children(selected));
      }
      return createElement(Fragment, null, String(selected ?? ''));
    };

    return memo(
      Selector,
      // Always return false to allow re-renders when the selected value changes
      // The memoization is just to prevent re-renders when parent re-renders
      () => false
    );
  }
}
