import {
  runAction,
  type BuilderAction,
  type BuilderSnapshot,
} from '@jfdevelops/multi-step-form-builder-core';
import { forwardRef } from 'react';
import { useBuilder, useBuilderSelector } from './context.js';
import { dataState, renderElement, useMergedRefs, type HeadlessProps } from './render.js';

/** Whether an action would do anything right now, for disabling buttons. */
export function canRunAction(snapshot: BuilderSnapshot, action: BuilderAction): boolean {
  const hasFields = snapshot.selection.type === 'fields';

  switch (action) {
    case 'undo':
      return snapshot.history.canUndo;
    case 'redo':
      return snapshot.history.canRedo;
    case 'delete':
    case 'duplicate':
      return snapshot.selection.type !== 'none';
    case 'copy':
    case 'cut':
    case 'moveUp':
    case 'moveDown':
      return hasFields;
    case 'paste':
      return snapshot.clipboard.fieldCount > 0 && snapshot.activeStepId !== null;
    case 'selectPrevious':
    case 'selectNext':
      return snapshot.activeStepId !== null;
    case 'clearSelection':
      return snapshot.selection.type !== 'none';
  }
}

/** Whether `action` can run, and a function that runs it. */
export function useBuilderAction(action: BuilderAction) {
  const builder = useBuilder();
  const enabled = useBuilderSelector((snapshot) => canRunAction(snapshot, action));

  return { enabled, run: () => runAction(builder, action) };
}

export interface ActionButtonState {
  action: BuilderAction;
  enabled: boolean;
}

export type ActionButtonProps = HeadlessProps<'button', ActionButtonState> & {
  action: BuilderAction;
};

/**
 * A button that runs a builder action (undo, redo, delete, duplicate, copy, cut, paste, …) and
 * is disabled when the action wouldn't do anything. Renders a `button`.
 */
export const ActionButton = forwardRef<HTMLElement, ActionButtonProps>(function ActionButton(
  { action, ...props },
  ref,
) {
  const { enabled, run } = useBuilderAction(action);
  const mergedRef = useMergedRefs(ref);

  return renderElement(
    'button',
    {
      type: 'button',
      disabled: !enabled,
      ...dataState({ action, disabled: !enabled }),
      onClick: run,
    },
    props,
    { action, enabled },
    mergedRef,
  );
});
