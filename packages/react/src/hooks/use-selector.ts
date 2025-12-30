import type {
  AnyResolvedStep,
  StepNumbers,
  HelperFnChosenSteps,
  Expand,
  HelperFnCtx,
} from '@jfdevelops/multi-step-form-core';
import { useSyncExternalStore } from 'react';

export type UseSelector<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
> = ReturnType<typeof createUseSelector<TResolvedStep, TSteps, TChosenSteps>>;
export type SelectorFn<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>,
  TSelected
> = (
  ctx: Expand<HelperFnCtx<TResolvedStep, TSteps, TChosenSteps>>
) => TSelected;

export function createUseSelector<
  TResolvedStep extends AnyResolvedStep,
  TSteps extends StepNumbers<TResolvedStep>,
  TChosenSteps extends HelperFnChosenSteps<TResolvedStep, TSteps>
>(
  createCtx: () => Expand<HelperFnCtx<TResolvedStep, TSteps, TChosenSteps>>,
  subscribe: (listener: () => void) => () => void
) {
  return <selected>(
    selector: SelectorFn<TResolvedStep, TSteps, TChosenSteps, selected>
  ) => {
    return useSyncExternalStore(
      subscribe,
      () => {
        const currentCtx = createCtx();
        return selector(currentCtx);
      },
      () => {
        const currentCtx = createCtx();
        return selector(currentCtx);
      }
    );
  };
}
