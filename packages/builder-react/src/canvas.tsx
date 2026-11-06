import { useDroppable } from '@dnd-kit/react';
import { useSortable } from '@dnd-kit/react/sortable';
import {
  handleKeyDown,
  type CanvasField as CanvasFieldModel,
  type CanvasModel,
  type SelectMode,
} from '@jfdevelops/multi-step-form-builder-core';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type RefCallback,
} from 'react';
import { useBuilder, useBuilderSelector, useCanvas, useShortcuts } from './context.js';
import { DRAG_TYPES, type BuilderDragData } from './dnd.js';
import {
  dataState,
  isEditableTarget,
  renderElement,
  useMergedRefs,
  type HeadlessProps,
} from './render.js';

export interface CanvasState extends CanvasModel {
  /** A field type or field is being dragged over the empty part of the canvas. */
  isDropTarget: boolean;
}

export type CanvasProps = HeadlessProps<'div', CanvasState>;

/**
 * The active step's fields. Handles keyboard shortcuts (undo, delete, duplicate, copy/paste,
 * reorder with Alt+↑/↓, move focus with ↑/↓) and accepts drops. Renders a `div` with
 * `role="listbox"`.
 */
export const Canvas = forwardRef<HTMLElement, CanvasProps>(function Canvas(props, ref) {
  const builder = useBuilder();
  const shortcuts = useShortcuts();
  const model = useCanvas();
  const stepId = model.activeStep?.id ?? '';
  const data: BuilderDragData = { kind: 'canvas', stepId, fieldCount: model.fields.length };
  const droppable = useDroppable({
    id: `canvas:${stepId}`,
    accept: [DRAG_TYPES.field, DRAG_TYPES.palette],
    disabled: !model.activeStep,
    data,
  });
  const mergedRef = useMergedRefs(ref, droppable.ref);

  return renderElement(
    'div',
    {
      role: 'listbox',
      'aria-multiselectable': true,
      'aria-label': model.activeStep ? `${model.activeStep.title} fields` : 'Fields',
      ...(model.activeStep
        ? {
            id: `msf-canvas-${model.activeStep.id}`,
            'aria-labelledby': `msf-step-tab-${model.activeStep.id}`,
          }
        : {}),
      ...dataState({ 'drop-target': droppable.isDropTarget, empty: model.fields.length === 0 }),
      onKeyDown: (event: KeyboardEvent) => {
        if (isEditableTarget(event.target)) return;

        if (handleKeyDown(builder, event, shortcuts)) event.preventDefault();
      },
      onMouseDown: (event: MouseEvent) => {
        // Clicking empty canvas space clears the selection.
        if (event.target === event.currentTarget) builder.select(null);
      },
    },
    props,
    { ...model, isDropTarget: droppable.isDropTarget },
    mergedRef,
  );
});

interface CanvasFieldContextValue {
  handleRef: RefCallback<Element>;
  label: string;
}

const CanvasFieldContext = createContext<CanvasFieldContextValue | null>(null);

export interface CanvasFieldState {
  field: CanvasFieldModel;
  isSelected: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  remove: () => void;
  duplicate: () => void;
}

export type CanvasFieldProps = HeadlessProps<'div', CanvasFieldState> & {
  field: CanvasFieldModel;
};

function selectModeFor(event: MouseEvent | KeyboardEvent): SelectMode {
  if (event.shiftKey) return 'range';
  if (event.metaKey || event.ctrlKey) return 'toggle';

  return 'replace';
}

/**
 * One field on the canvas. Click to select (Shift for a range, ⌘/Ctrl to toggle). Sortable by
 * dragging its `<DragHandle>`. Renders a `div` with `role="option"`.
 */
export const CanvasField = forwardRef<HTMLElement, CanvasFieldProps>(function CanvasField(
  { field, ...props },
  ref,
) {
  const builder = useBuilder();
  const stepId = useBuilderSelector((snapshot) => snapshot.activeStepId ?? '');
  const isFocusTarget = useBuilderSelector((snapshot) => {
    const { selection } = snapshot;

    if (selection.type === 'fields') return selection.anchorId === field.id;

    return field.index === 0;
  });
  const data: BuilderDragData = {
    kind: 'field',
    fieldId: field.id,
    stepId,
    index: field.index,
  };
  const sortable = useSortable({
    id: field.id,
    index: field.index,
    group: stepId,
    type: DRAG_TYPES.field,
    accept: [DRAG_TYPES.field, DRAG_TYPES.palette],
    data,
  });
  const element = useRef<HTMLElement | null>(null);
  const mergedRef = useMergedRefs(ref, sortable.ref, element);
  const label =
    typeof field.field.label === 'string' && field.field.label ? field.field.label : field.key;

  // Keep keyboard focus on the field selection moves to (↑/↓, after delete, after paste).
  useEffect(() => {
    const node = element.current;
    const active = node?.ownerDocument.activeElement;

    if (
      field.isSelected &&
      isFocusTarget &&
      node &&
      active !== node &&
      active instanceof HTMLElement &&
      active.closest('[role="listbox"]') === node.closest('[role="listbox"]') &&
      !isEditableTarget(active)
    ) {
      node.focus();
    }
  }, [field.isSelected, isFocusTarget]);

  return (
    <CanvasFieldContext.Provider value={{ handleRef: sortable.handleRef, label }}>
      {renderElement(
        'div',
        {
          role: 'option',
          'aria-selected': field.isSelected,
          'aria-label': label,
          tabIndex: isFocusTarget ? 0 : -1,
          ...dataState({
            selected: field.isSelected,
            dragging: sortable.isDragging,
            'drop-target': sortable.isDropTarget,
            invalid: field.issues.some((issue) => issue.severity === 'error'),
            type: field.field.type,
          }),
          onClick: (event: MouseEvent) => builder.select(field.id, selectModeFor(event)),
          onFocus: (event: { target: EventTarget; currentTarget: EventTarget }) => {
            // Tabbing onto an unselected field selects it.
            if (event.target === event.currentTarget && !field.isSelected) {
              builder.select(field.id);
            }
          },
        },
        props,
        {
          field,
          isSelected: field.isSelected,
          isDragging: sortable.isDragging,
          isDropTarget: sortable.isDropTarget,
          remove: () => builder.fields.remove(field.id),
          duplicate: () => builder.fields.duplicate(field.id),
        },
        mergedRef,
      )}
    </CanvasFieldContext.Provider>
  );
});

export type DragHandleProps = HeadlessProps<'button', Record<string, never>>;

/**
 * The handle that starts dragging its `<CanvasField>`. Space picks the field up for a keyboard
 * drag; arrow keys move it; Space or Enter drops it; Escape cancels. Renders a `button`.
 */
export const DragHandle = forwardRef<HTMLElement, DragHandleProps>(function DragHandle(
  props,
  ref,
) {
  const context = useContext(CanvasFieldContext);

  if (!context) throw new Error('<DragHandle> must be used inside <CanvasField>.');

  const mergedRef = useMergedRefs(ref, context.handleRef as RefCallback<HTMLElement>);

  return renderElement(
    'button',
    {
      type: 'button',
      'aria-label': `Drag ${context.label}`,
      'aria-roledescription': 'drag handle',
      // Keyboard drags start from the handle, not from field shortcuts.
      onKeyDown: (event: KeyboardEvent) => event.stopPropagation(),
      onClick: (event: MouseEvent) => event.stopPropagation(),
    },
    props,
    {},
    mergedRef,
  );
});
