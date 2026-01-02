import type {
  AnyResolvedStep,
  StepNumbers,
  HelperFnChosenSteps,
  Expand,
  HelperFnCtx,
} from '@jfdevelops/multi-step-form-core';
import { useSyncExternalStore, useRef } from 'react';

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
    const snapshotCacheRef = useRef<{ value: selected } | null>(null);

    const getSnapshot = () => {
      const currentCtx = createCtx();
      const newValue = selector(currentCtx);

      // Cache the result to ensure stable reference
      if (snapshotCacheRef.current === null) {
        snapshotCacheRef.current = { value: newValue };

        return newValue;
      }

      // Only update if the value actually changed
      if (!Object.is(snapshotCacheRef.current.value, newValue)) {
        snapshotCacheRef.current = { value: newValue };
      }

      return snapshotCacheRef.current.value;
    };

    return useSyncExternalStore(
      subscribe,
      () => getSnapshot(),
      () => getSnapshot()
    );
  };
}
