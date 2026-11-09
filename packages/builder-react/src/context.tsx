import { DragDropProvider, useDragOperation } from '@dnd-kit/react';
import {
  createFormBuilder,
  getCanvasModel,
  getInspectorModel,
  getPaletteModel,
  getStepValidationModel,
  type BuilderSnapshot,
  type DragSource,
  type DropTarget,
  type FormBuilder as CoreFormBuilder,
  type FormBuilderOptions,
  type ShortcutMap,
} from '@jfdevelops/multi-step-form-builder-core';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { resolveDrop, type DragEntityLike } from './dnd.js';

interface BuilderContextValue {
  builder: CoreFormBuilder;
  shortcuts?: ShortcutMap;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

type DragDropProviderProps = ComponentProps<typeof DragDropProvider>;

export interface FormBuilderProps {
  builder: CoreFormBuilder;
  /** Overrides or disables keyboard shortcuts on the canvas. */
  shortcuts?: ShortcutMap;
  /** Passed to dnd-kit's `DragDropProvider`, e.g. custom `sensors` or `plugins`. */
  dragDrop?: Omit<DragDropProviderProps, 'children' | 'onDragEnd'>;
  /** Called after a drop is applied, with the affected field ids. */
  onDrop?: (
    fieldIds: string[],
    drop: { source: DragSource; target: DropTarget },
  ) => void;
  children?: ReactNode;
}

/**
 * Provides a builder to the headless components and hooks, and sets up drag and drop.
 *
 * ```tsx
 * const builder = useFormBuilder();
 *
 * <FormBuilder builder={builder}>
 *   <Palette />
 *   <Canvas />
 *   <Inspector />
 * </FormBuilder>
 * ```
 */
export function FormBuilder({
  builder,
  shortcuts,
  dragDrop,
  onDrop,
  children,
}: FormBuilderProps) {
  const value = useMemo(() => ({ builder, shortcuts }), [builder, shortcuts]);

  return (
    <BuilderContext.Provider value={value}>
      <DragDropProvider
        {...dragDrop}
        onDragEnd={(event) => {
          if (event.canceled) return;

          const drop = resolveDrop(
            event.operation.source as DragEntityLike | null,
            event.operation.target as DragEntityLike | null,
          );

          if (!drop) return;

          const ids = builder.drop(drop.source, drop.target);

          if (ids.length > 0) onDrop?.(ids, drop);
        }}
      >
        {children}
      </DragDropProvider>
    </BuilderContext.Provider>
  );
}

function useBuilderContext(hook: string) {
  const context = useContext(BuilderContext);

  if (!context) {
    throw new Error(`${hook} must be used inside <FormBuilder>.`);
  }

  return context;
}

/**
 * Creates a builder once for the lifetime of the component. Options are read on the first render
 * only.
 */
export function useFormBuilder(options?: FormBuilderOptions): CoreFormBuilder {
  const [builder] = useState(() => createFormBuilder(options));

  useEffect(() => () => builder.destroy(), [builder]);

  return builder;
}

/** The builder from the nearest `<FormBuilder>`. */
export function useBuilder() {
  return useBuilderContext('useBuilder').builder;
}

/** @internal */
export function useShortcuts() {
  return useBuilderContext('useShortcuts').shortcuts;
}

/** Subscribes to a builder's snapshot without needing `<FormBuilder>`. */
export function useFormBuilderSnapshot(builder: CoreFormBuilder) {
  return useSyncExternalStore(
    builder.subscribe,
    builder.getSnapshot,
    builder.getSnapshot,
  );
}

/** Subscribes to the snapshot of the builder from `<FormBuilder>`. Re-renders on every change. */
export function useBuilderSnapshot() {
  return useFormBuilderSnapshot(useBuilder());
}

/**
 * Subscribes to part of the snapshot. Re-renders only when the selected value changes according
 * to `isEqual` (`Object.is` by default).
 */
export function useBuilderSelector<T>(
  selector: (snapshot: BuilderSnapshot) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
) {
  const builder = useBuilder();
  const cache = useRef<{ snapshot: BuilderSnapshot; value: T } | null>(null);
  const getValue = () => {
    const snapshot = builder.getSnapshot();
    const cached = cache.current;

    if (cached && cached.snapshot === snapshot) return cached.value;

    const value = selector(snapshot);

    if (cached && isEqual(cached.value, value)) {
      cache.current = { snapshot, value: cached.value };
      return cached.value;
    }

    cache.current = { snapshot, value };

    return value;
  };

  return useSyncExternalStore(builder.subscribe, getValue, getValue);
}

/** The palette model, filtered by `search`. */
export function usePalette(search = '') {
  const snapshot = useBuilderSnapshot();

  return useMemo(
    () => getPaletteModel(snapshot.registry, search),
    [snapshot.registry, search],
  );
}

/** The canvas model for the active step. */
export function useCanvas() {
  const snapshot = useBuilderSnapshot();

  return useMemo(() => getCanvasModel(snapshot), [snapshot]);
}

/** The inspector model for the current selection. */
export function useInspector() {
  const snapshot = useBuilderSnapshot();

  return useMemo(() => getInspectorModel(snapshot), [snapshot]);
}

/** The validation model for a step. Defaults to the active step. */
export function useStepValidation(stepId?: string) {
  const snapshot = useBuilderSnapshot();
  const id = stepId ?? snapshot.activeStepId;

  return useMemo(
    () => (id ? getStepValidationModel(snapshot, id) : undefined),
    [snapshot, id],
  );
}

export interface BuilderDragState {
  /** What is being dragged, or `null` when nothing is. */
  source: DragSource | null;
  /** Where it would land right now. */
  target: DropTarget | null;
  /** Why the current target is blocked, if it is. */
  blockedReason?: string;
}

/** Live drag state, for rendering drag previews and drop hints. */
export function useBuilderDrag(): BuilderDragState {
  const builder = useBuilder();
  const operation = useDragOperation();
  const source = operation.source as DragEntityLike | null | undefined;
  const target = operation.target as DragEntityLike | null | undefined;

  if (!source) return { source: null, target: null };

  const drop = resolveDrop(source, target);

  if (!drop) {
    const data = source.data as {
      kind?: string;
      fieldType?: string;
      fieldId?: string;
    };
    const dragSource: DragSource | null =
      data?.kind === 'palette'
        ? { kind: 'palette', fieldType: data.fieldType! }
        : data?.kind === 'field'
          ? { kind: 'field', fieldId: data.fieldId! }
          : null;

    return { source: dragSource, target: null };
  }

  const allowed = builder.canDrop(drop.source, drop.target);

  return {
    source: drop.source,
    target: drop.target,
    ...(allowed === true ? {} : { blockedReason: allowed }),
  };
}
