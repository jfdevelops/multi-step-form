import {
  createElement,
  useCallback,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefCallback,
} from 'react';

/** Props every headless element accepts, on top of the underlying element's own props. */
export type HeadlessProps<
  TTag extends keyof HTMLElementTagNameMap,
  TState,
> = Omit<ComponentPropsWithoutRef<TTag>, 'children'> & {
  /** Content, or a function of the element's state. */
  children?: ReactNode | ((state: TState) => ReactNode);
  /**
   * Renders your own element instead of the default one. Spread `props` (including `ref`) onto
   * it so behavior, accessibility attributes and drag and drop keep working.
   */
  render?: (
    props: Record<string, unknown> & { ref: RefCallback<HTMLElement> },
    state: TState,
  ) => ReactElement;
};

type AnyRef<T> = Ref<T> | undefined | null;

function assignRef<T>(ref: AnyRef<T>, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

/** Combines refs into one callback ref. */
export function useMergedRefs<T>(...refs: AnyRef<T>[]): RefCallback<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((value: T | null) => refs.forEach((ref) => assignRef(ref, value)), refs);
}

type Handler = (event: { defaultPrevented?: boolean }) => void;

/**
 * Merges library props with user props. User event handlers run first; calling
 * `event.preventDefault()` in one skips the library's handler.
 */
export function mergeProps(
  ours: Record<string, unknown>,
  theirs: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...ours, ...theirs };

  for (const [key, value] of Object.entries(ours)) {
    const user = theirs[key];

    if (/^on[A-Z]/.test(key) && typeof value === 'function' && typeof user === 'function') {
      merged[key] = (event: { defaultPrevented?: boolean }) => {
        (user as Handler)(event);

        if (!event.defaultPrevented) (value as Handler)(event);
      };
    }
  }

  if (ours.className && theirs.className) {
    merged.className = `${String(ours.className)} ${String(theirs.className)}`;
  }

  if (ours.style && theirs.style) {
    merged.style = { ...(ours.style as object), ...(theirs.style as object) };
  }

  return merged;
}

/** Renders a headless element: the default tag, or the user's `render` function. */
export function renderElement<TState>(
  tag: ElementType,
  ours: Record<string, unknown>,
  userProps: { children?: ReactNode | ((state: TState) => ReactNode); render?: unknown } & Record<
    string,
    unknown
  >,
  state: TState,
  ref: RefCallback<HTMLElement>,
): ReactElement {
  const { children, render, ...rest } = userProps;
  const props = { ...mergeProps(ours, rest), ref };
  const content = typeof children === 'function' ? children(state) : children;

  if (typeof render === 'function') {
    return (render as (props: Record<string, unknown>, state: TState) => ReactElement)(
      content === undefined ? props : { ...props, children: content },
      state,
    );
  }

  return createElement(tag, props, content);
}

/** `data-*` attributes for boolean states, so elements can be styled without JavaScript. */
export function dataState(states: Record<string, boolean | string | undefined>) {
  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(states)) {
    if (value === true) attributes[`data-${key}`] = '';
    else if (typeof value === 'string') attributes[`data-${key}`] = value;
  }

  return attributes;
}

/** Whether a keyboard event comes from a text-editing element, where shortcuts must not fire. */
export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
