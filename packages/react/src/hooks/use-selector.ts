import type {
  AnyResolvedStep,
  StepNumbers,
  HelperFnChosenSteps,
  Expand,
  HelperFnCtx,
  MultiStepFormLogger,
  MultiStepFormLoggerOptions
} from '@jfdevelops/multi-step-form-core';
import { useSyncExternalStore, useRef } from 'react';

/**
 * Deep equality check that compares values regardless of property order.
 * Handles objects, arrays, primitives, and null/undefined.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  // Same reference or both are the same primitive value
  if (a === b) {
    return true;
  }

  // Handle null/undefined
  if (a == null || b == null) {
    return a === b;
  }

  // Type mismatch
  if (typeof a !== typeof b) {
    return false;
  }

  // Both are primitives (but not equal due to first check)
  if (typeof a !== 'object') {
    return false;
  }

  // Both are arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // One is array, other is not
  if (Array.isArray(a) || Array.isArray(b)) {
    return false;
  }

  // Both are objects (not arrays)
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);

  if (keysA.length !== keysB.length) {
    return false;
  }

  // Check if all keys in A exist in B with equal values
  for (const key of keysA) {
    if (!keysB.includes(key)) {
      return false;
    }
    if (
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    ) {
      return false;
    }
  }

  return true;
}

type PrefixOptions = {
  /**
   * The action to perform on the prefix.
   *
   * @default 'prepend'
   */
  action?: 'prepend' | 'append';
  /**
   * The value to add to the prefix.
   */
  value: string | ((prefix: string) => string);
  /**
   * The delimiter to use between the original prefix and the added prefix.
   * @default '-'
   * @example
   * ```tsx
   * <Selector debug={{ prefix: { action: 'prepend', value: 'MySelector', delimiter: '|' } }}>
   *   {(value) => <p>First name: {value}</p>}
   * </Selector>
   * ```
   */
  delimiter?: string;
};

/**
 * Debug options for customizing logging behavior in the Selector component.
 * All options are optional - you can provide any combination of these functions
 * to customize how debug information is logged.
 */
export type DebugOptions<TSelected> = {
  /**
   * The prefix to use for the logger.
   *
   * If a string or function is provided, it will replace the default prefix.
   * If you need to prepend or append to the default prefix, you can provide {@linkcode PrefixOptions}.
   * @default 'MultiStepFormSchema-Selector'
   *
   * @example
   * ```tsx
   * <Selector debug={{ prefix: 'MySelector' }}>
   *   {(value) => <p>First name: {value}</p>}
   * </Selector>
   * ```
   *
   */
  prefix?: MultiStepFormLoggerOptions['prefix'] | PrefixOptions;
  /**
   * Called when the Selector component renders with the selected value.
   * This is called on every render of the Selector component, regardless of
   * whether the selected value has changed.
   *
   * @param selected - The current selected value from the selector function
   */
  onRender?: (selected: TSelected) => string;

  /**
   * Called when the Selector component renders its children.
   * This is only called when the Selector has a children render prop.
   */
  onChildrenRender?: () => string;

  /**
   * Called when the initial value is set for the first time.
   * This is called once when the selector first evaluates and caches its value.
   *
   * @param value - The initial selected value
   */
  onInitialValue?: (value: TSelected) => string;

  /**
   * Called when the selected value changes from one value to another.
   * This is called whenever the selector detects that the value has changed
   * (using Object.is() for primitives or deep comparison for objects/arrays).
   *
   * @param oldValue - The previous selected value
   * @param newValue - The new selected value
   */
  onValueChanged?: (oldValue: TSelected, newValue: TSelected) => string;

  /**
   * Called when the selected value is checked but hasn't changed.
   * This is called when the selector evaluates but determines that the value
   * is the same as the previously cached value.
   *
   * @param value - The current selected value (unchanged from previous check)
   */
  onValueUnchanged?: (value: TSelected) => string;
};

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
    selectorFn: SelectorFn<TResolvedStep, TSteps, TChosenSteps, selected>,
    logger?: MultiStepFormLogger,
    debugOptions?: DebugOptions<selected>
  ) => {
    const snapshotCacheRef = useRef<{ value: selected } | null>(null);
    const selectorRef = useRef(selectorFn);

    // Update the selector ref on every render to ensure we always use the latest selector
    selectorRef.current = selectorFn;

    const getSnapshot = () => {
      const currentCtx = createCtx();
      const newValue = selectorRef.current(currentCtx);

      // Cache the result to ensure stable reference
      if (snapshotCacheRef.current === null) {
        snapshotCacheRef.current = { value: newValue };

        logger?.info(
          debugOptions?.onInitialValue?.(newValue) ??
            `Initial value: ${JSON.stringify(newValue)}`
        );

        return newValue;
      }

      // Check if the value actually changed
      // For primitive values, use Object.is() for fast comparison
      // For complex values, use deep comparison
      const isPrimitive =
        newValue === null ||
        (typeof newValue !== 'object' && typeof newValue !== 'function');

      let hasChanged: boolean;

      if (isPrimitive) {
        // Use Object.is() for primitives (faster and more reliable)
        hasChanged = !Object.is(snapshotCacheRef.current.value, newValue);
      } else {
        // For objects/arrays, we need to do a deep comparison
        // First check reference equality (fast path)
        const oldValue = snapshotCacheRef.current.value;
        if (oldValue === newValue) {
          hasChanged = false;
        } else {
          // Deep comparison using a proper deep equality function
          // This correctly handles property order differences
          hasChanged = !deepEqual(oldValue, newValue);
        }
      }

      if (hasChanged) {
        const oldValue = snapshotCacheRef.current.value;

        snapshotCacheRef.current = { value: newValue };

        logger?.info(
          debugOptions?.onValueChanged?.(oldValue, newValue) ??
            `Value changed: ${JSON.stringify(oldValue)} -> ${JSON.stringify(
              newValue
            )}`
        );
        // Return the new value so useSyncExternalStore can detect the change via Object.is()
        return newValue;
      }

      // Return the cached value to maintain stable reference when value hasn't changed
      logger?.info(
        debugOptions?.onValueUnchanged?.(newValue) ??
          `Value unchanged: ${JSON.stringify(newValue)}`
      );

      return snapshotCacheRef.current.value;
    };

    return useSyncExternalStore(
      subscribe,
      () => getSnapshot(),
      () => getSnapshot()
    );
  };
}
