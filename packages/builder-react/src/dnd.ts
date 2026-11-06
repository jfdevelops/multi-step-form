import { KeyboardSensor, PointerSensor, type UseDraggableInput } from '@dnd-kit/react';
import type {
  DragSource,
  DropTarget,
} from '@jfdevelops/multi-step-form-builder-core';

/** Data attached to every draggable and droppable this package registers with dnd-kit. */
export type BuilderDragData =
  | { kind: 'palette'; fieldType: string }
  | { kind: 'field'; fieldId: string; stepId: string; index: number }
  | { kind: 'canvas'; stepId: string; fieldCount: number }
  | { kind: 'step'; stepId: string; fieldCount: number };

/** dnd-kit drag types, used for `accept` rules. */
export const DRAG_TYPES = { palette: 'msf-palette', field: 'msf-field' } as const;

/** The subset of a dnd-kit entity this package reads. */
export interface DragEntityLike {
  data?: unknown;
  /** Present on sortable entities. */
  index?: number;
  group?: string | number;
  initialIndex?: number;
  initialGroup?: string | number;
}

function isBuilderData(data: unknown): data is BuilderDragData {
  return typeof data === 'object' && data !== null && 'kind' in data;
}

function toDragSource(data: BuilderDragData): DragSource | null {
  if (data.kind === 'palette') return { kind: 'palette', fieldType: data.fieldType };
  if (data.kind === 'field') return { kind: 'field', fieldId: data.fieldId };

  return null;
}

/**
 * Translates a finished dnd-kit operation into a builder drop. Returns `null` when the drop
 * should do nothing (no target, cancelled, dropped in place).
 *
 * Sortable fields report their final position through `index`/`group` (dnd-kit sorts them
 * optimistically while dragging), so a field dropped on the canvas uses those. Other drops use
 * the droppable they ended over.
 */
export function resolveDrop(
  source: DragEntityLike | null | undefined,
  target: DragEntityLike | null | undefined,
): { source: DragSource; target: DropTarget } | null {
  if (!source || !isBuilderData(source.data)) return null;

  const dragSource = toDragSource(source.data);

  if (!dragSource) return null;

  const targetData = target && isBuilderData(target.data) ? target.data : undefined;

  // Dropped on a step tab or an empty canvas: append to that step.
  if (targetData?.kind === 'step' || targetData?.kind === 'canvas') {
    if (source.data.kind === 'field' && targetData.stepId === source.data.stepId && targetData.kind === 'step') {
      return null;
    }

    if (source.data.kind === 'field' && source.group !== undefined && targetData.kind === 'canvas') {
      // A sortable dropped on its own list's padding: trust the sortable position.
      return {
        source: dragSource,
        target: { stepId: String(source.group), index: source.index ?? targetData.fieldCount },
      };
    }

    return {
      source: dragSource,
      target: { stepId: targetData.stepId, index: targetData.fieldCount },
    };
  }

  // A field reordered within the canvas.
  if (source.data.kind === 'field' && source.index !== undefined && source.group !== undefined) {
    if (source.index === source.initialIndex && source.group === source.initialGroup) return null;

    return {
      source: dragSource,
      target: { stepId: String(source.group), index: source.index },
    };
  }

  // A palette item dropped on a field: insert before that field.
  if (targetData?.kind === 'field') {
    return {
      source: dragSource,
      target: { stepId: targetData.stepId, index: target?.index ?? targetData.index },
    };
  }

  return null;
}

/**
 * Sensors for palette items: Enter adds the field (see `PaletteItem`), so only Space starts a
 * keyboard drag.
 */
export const PALETTE_SENSORS: UseDraggableInput['sensors'] = [
  PointerSensor,
  KeyboardSensor.configure({
    keyboardCodes: {
      start: ['Space'],
      cancel: ['Escape'],
      end: ['Space', 'Enter', 'Tab'],
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
    },
  }),
];
