import { useDroppable } from '@dnd-kit/react';
import type { CanvasStep } from '@jfdevelops/multi-step-form-builder-core';
import { forwardRef, type KeyboardEvent } from 'react';
import { useBuilder, useCanvas } from './context.js';
import { DRAG_TYPES, type BuilderDragData } from './dnd.js';
import { dataState, renderElement, useMergedRefs, type HeadlessProps } from './render.js';

export interface StepListState {
  steps: CanvasStep[];
}

export type StepListProps = HeadlessProps<'div', StepListState>;

/** The list of steps, as tabs. Renders a `div` with `role="tablist"`. */
export const StepList = forwardRef<HTMLElement, StepListProps>(function StepList(props, ref) {
  const { steps } = useCanvas();
  const mergedRef = useMergedRefs(ref);

  return renderElement(
    'div',
    { role: 'tablist', 'aria-label': 'Steps', 'aria-orientation': 'horizontal' },
    props,
    { steps },
    mergedRef,
  );
});

export interface StepTabState {
  step: CanvasStep;
  /** A field is being dragged over this tab. */
  isDropTarget: boolean;
  activate: () => void;
  remove: () => void;
  duplicate: () => void;
}

export type StepTabProps = HeadlessProps<'button', StepTabState> & {
  step: CanvasStep;
};

/**
 * One step. Clicking shows it on the canvas; dropping a field on it moves the field to the end of
 * the step. Arrow keys move between tabs. Renders a `button` with `role="tab"`.
 */
export const StepTab = forwardRef<HTMLElement, StepTabProps>(function StepTab(
  { step, ...props },
  ref,
) {
  const builder = useBuilder();
  const data: BuilderDragData = { kind: 'step', stepId: step.id, fieldCount: step.fieldCount };
  const droppable = useDroppable({
    id: `step:${step.id}`,
    accept: [DRAG_TYPES.field, DRAG_TYPES.palette],
    data,
  });
  const mergedRef = useMergedRefs(ref, droppable.ref);
  const activate = () => builder.steps.setActive(step.id);

  return renderElement(
    'button',
    {
      type: 'button',
      role: 'tab',
      id: `msf-step-tab-${step.id}`,
      'aria-selected': step.isActive,
      'aria-controls': `msf-canvas-${step.id}`,
      tabIndex: step.isActive ? 0 : -1,
      ...dataState({
        active: step.isActive,
        selected: step.isSelected,
        'drop-target': droppable.isDropTarget,
        invalid: step.issues.some((issue) => issue.severity === 'error'),
      }),
      onClick: activate,
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

        const { definition } = builder.getSnapshot();
        const index = definition.steps.findIndex((candidate) => candidate.id === step.id);
        const next = definition.steps[index + (event.key === 'ArrowRight' ? 1 : -1)];

        if (!next) return;

        event.preventDefault();
        builder.steps.setActive(next.id);
        event.currentTarget.ownerDocument.getElementById(`msf-step-tab-${next.id}`)?.focus();
      },
    },
    props,
    {
      step,
      isDropTarget: droppable.isDropTarget,
      activate,
      remove: () => builder.steps.remove(step.id),
      duplicate: () => builder.steps.duplicate(step.id),
    },
    mergedRef,
  );
});

export type AddStepButtonProps = HeadlessProps<'button', Record<string, never>>;

/** Adds a step after the last one and shows it. Renders a `button`. */
export const AddStepButton = forwardRef<HTMLElement, AddStepButtonProps>(
  function AddStepButton(props, ref) {
    const builder = useBuilder();
    const mergedRef = useMergedRefs(ref);

    return renderElement(
      'button',
      { type: 'button', onClick: () => builder.steps.add() },
      props,
      {},
      mergedRef,
    );
  },
);
