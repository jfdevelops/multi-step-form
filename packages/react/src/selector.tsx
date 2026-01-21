import {
  type Expand,
  type HelperFn,
  MultiStepFormLogger,
  type steps,
} from '@jfdevelops/multi-step-form-core';
import { createElement, useMemo } from 'react';
import { Fragment } from 'react/jsx-runtime';
import {
  createUseSelector,
  type DebugOptions,
  type SelectorFn,
} from './hooks/use-selector';

export namespace selector {
  export type props<steps extends steps.instantiateSteps, selected> = {
    selector: SelectorFn<steps, selected>;
    children?: (selected: selected) => React.ReactNode;
    /**
     * Optional debug options to customize logging behavior.
     */
    debug?: boolean | DebugOptions<selected>;
  };
  export type component<steps extends steps.instantiateSteps> =
    /**
     * A component for reactively displaying a value from the form context.
     * Unlike `useSelector`, this component only re-renders itself, not the parent component.
     * Use this when you want to display a reactive value without causing parent re-renders.
     *
     * @param props - The props for the Selector component.
     *
     * @example
     * ```tsx
     * // With no debug options (default behavior)
     * <Selector selector={(ctx) => ctx.step1.fields.firstName.defaultValue}>
     *   {(value) => <p>First name: {value}</p>}
     * </Selector>
     * ```

     * @example
     * ```tsx
     * // With debug enabled
     *  <Selector selector={(ctx) => ctx.step1.fields.firstName.defaultValue} debug>
     *   {(value) => <p>First name: {value}</p>}
     * </Selector>
     * ```
     *
     * @example
     * ```tsx
     * // With custom debug options
     * <Selector
     *   selector={(ctx) => ctx.step1.fields.firstName.defaultValue}
     *   debug={{
     *     onRender: (value) => console.log('Rendered with:', value),
     *     onValueChanged: (oldVal, newVal) => console.log('Changed:', oldVal, '->', newVal)
     *   }}
     * >
     *   {(value) => <p>First name: {value}</p>}
     * </Selector>
     * ```
     */
    <selected>(props: props<steps, selected>) => React.ReactNode;

  export function create<steps extends steps.instantiateSteps>(
    createCtx: () => Expand<
      HelperFn.buildCtx<steps, [steps.StepNumbers<steps>]>
    >,
    subscribe: (listener: () => void) => () => void
  ) {
    const useSelector = createUseSelector(createCtx, subscribe);
    const Selector: component<steps> = ({ selector, children, debug }) => {
      const isDebugEnabled =
        typeof debug === 'boolean' ? debug : debug !== undefined;
      const debugOptions = typeof debug === 'object' ? debug : undefined;
      const prefix = debugOptions?.prefix;

      const logger = useMemo(() => {
        if (!isDebugEnabled) {
          return undefined;
        }

        return new MultiStepFormLogger({
          debug: true,
          prefix: (defaultValue) => {
            const defaultPrefix = `${defaultValue}-Selector`;
            console.log(prefix);

            // If no prefix is provided, use default
            if (!prefix) {
              return defaultPrefix;
            }

            // If prefix is a string, use it directly
            if (typeof prefix === 'string') {
              return prefix;
            }

            // If prefix is a function, call it with the default prefix
            if (typeof prefix === 'function') {
              return prefix(defaultValue);
            }

            // If prefix is an object with action/value, handle prepend/append
            if (typeof prefix === 'object') {
              const { action = 'prepend', value, delimiter = '-' } = prefix;
              const resolvedValue =
                typeof value === 'function' ? value(defaultValue) : value;

              if (action === 'prepend') {
                return `${resolvedValue}${delimiter}${defaultPrefix}`;
              }

              if (action === 'append') {
                return `${defaultPrefix}${delimiter}${resolvedValue}`;
              }

              return defaultPrefix;
            }

            return defaultPrefix;
          },
        });
      }, [isDebugEnabled, prefix]);

      const selected = useSelector(selector, logger, debugOptions);

      logger?.info(
        debugOptions?.onRender?.(selected) ??
          `Rendering with selected: ${JSON.stringify(selected)}`
      );

      if (children) {
        return createElement(Fragment, null, children(selected));
      }
      return createElement(Fragment, null, String(selected ?? ''));
    };

    // Remove memo to test if it's causing the issue
    // The memo was meant to prevent re-renders when parent re-renders,
    // but useSyncExternalStore should handle reactivity
    return Selector;
  }
}
