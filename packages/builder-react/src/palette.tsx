import { useDraggable } from '@dnd-kit/react';
import type { PaletteItem as PaletteItemModel, PaletteModel } from '@jfdevelops/multi-step-form-builder-core';
import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useState,
  type KeyboardEvent,
} from 'react';
import { usePalette, useBuilder } from './context.js';
import { DRAG_TYPES, PALETTE_SENSORS, type BuilderDragData } from './dnd.js';
import { dataState, renderElement, useMergedRefs, type HeadlessProps } from './render.js';

interface PaletteContextValue {
  search: string;
  setSearch: (search: string) => void;
  listId: string;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

function usePaletteContext(component: string) {
  const context = useContext(PaletteContext);

  if (!context) throw new Error(`<${component}> must be used inside <Palette>.`);

  return context;
}

export interface PaletteState extends PaletteModel {
  setSearch: (search: string) => void;
}

export type PaletteProps = HeadlessProps<'div', PaletteState>;

/**
 * The list of field types authors can add. Renders a `div`; use `children` as a function to map
 * over `categories`, and `<PaletteItem>` for each item.
 */
export const Palette = forwardRef<HTMLElement, PaletteProps>(function Palette(props, ref) {
  const [search, setSearch] = useState('');
  const model = usePalette(search);
  const listId = useId();
  const mergedRef = useMergedRefs(ref);

  return (
    <PaletteContext.Provider value={{ search, setSearch, listId }}>
      {renderElement(
        'div',
        { id: listId, role: 'listbox', 'aria-label': 'Fields' },
        props,
        { ...model, setSearch },
        mergedRef,
      )}
    </PaletteContext.Provider>
  );
});

export interface PaletteSearchState {
  search: string;
}

export type PaletteSearchProps = HeadlessProps<'input', PaletteSearchState>;

/** A search box that filters the palette. Renders an `input`. */
export const PaletteSearch = forwardRef<HTMLElement, PaletteSearchProps>(
  function PaletteSearch(props, ref) {
    const { search, setSearch, listId } = usePaletteContext('PaletteSearch');
    const mergedRef = useMergedRefs(ref);

    return renderElement(
      'input',
      {
        type: 'search',
        role: 'searchbox',
        'aria-controls': listId,
        'aria-label': 'Search fields',
        value: search,
        onChange: (event: { target: { value: string } }) => setSearch(event.target.value),
      },
      props,
      { search },
      mergedRef,
    );
  },
);

export interface PaletteItemState {
  item: PaletteItemModel;
  isDragging: boolean;
  /** Adds the field to the canvas (after the selection, or at the end of the active step). */
  add: () => void;
}

export type PaletteItemProps = HeadlessProps<'div', PaletteItemState> & {
  item: PaletteItemModel;
};

/**
 * A field type authors can drag onto the canvas, click, or press Enter on to add. Renders a
 * `div` with `role="option"`.
 */
export const PaletteItem = forwardRef<HTMLElement, PaletteItemProps>(function PaletteItem(
  { item, ...props },
  ref,
) {
  const builder = useBuilder();
  const data: BuilderDragData = { kind: 'palette', fieldType: item.type };
  const draggable = useDraggable({
    id: `palette:${item.type}`,
    type: DRAG_TYPES.palette,
    sensors: PALETTE_SENSORS,
    data,
  });
  const mergedRef = useMergedRefs(ref, draggable.ref);

  const add = () => {
    const { selection } = builder.getSnapshot();

    if (selection.type === 'fields') {
      const step = builder.getStep(selection.stepId);
      const last = selection.fieldIds[selection.fieldIds.length - 1];
      const index = step ? step.fields.findIndex((field) => field.id === last) + 1 : undefined;

      builder.fields.add(item.type, { stepId: selection.stepId, index });
    } else {
      builder.fields.add(item.type);
    }
  };

  return renderElement(
    'div',
    {
      role: 'option',
      tabIndex: 0,
      'aria-selected': false,
      'aria-roledescription': 'draggable field type',
      ...dataState({ dragging: draggable.isDragging, type: item.type }),
      onClick: add,
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          add();
        }
      },
    },
    props,
    { item, isDragging: draggable.isDragging, add },
    mergedRef,
  );
});
