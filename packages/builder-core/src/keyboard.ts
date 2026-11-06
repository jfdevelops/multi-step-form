import type { FormBuilder } from './builder.js';

export type BuilderAction =
  | 'undo'
  | 'redo'
  | 'delete'
  | 'duplicate'
  | 'copy'
  | 'cut'
  | 'paste'
  | 'moveUp'
  | 'moveDown'
  | 'selectPrevious'
  | 'selectNext'
  | 'clearSelection';

/** The key-related parts of a keyboard event, so any event source can be used. */
export interface KeyInput {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}

/**
 * Shortcut strings map to actions. Modifiers are joined with `+`: `mod` is ⌘ on macOS and Ctrl
 * elsewhere (either is accepted). Set an action to `false` to disable a default shortcut.
 */
export type ShortcutMap = Record<string, BuilderAction | false>;

export const DEFAULT_SHORTCUTS: Readonly<Record<string, BuilderAction>> = {
  'mod+z': 'undo',
  'mod+shift+z': 'redo',
  'mod+y': 'redo',
  delete: 'delete',
  backspace: 'delete',
  'mod+d': 'duplicate',
  'mod+c': 'copy',
  'mod+x': 'cut',
  'mod+v': 'paste',
  'alt+arrowup': 'moveUp',
  'alt+arrowdown': 'moveDown',
  arrowup: 'selectPrevious',
  arrowdown: 'selectNext',
  escape: 'clearSelection',
};

function normalize(input: KeyInput) {
  const parts: string[] = [];

  if (input.metaKey || input.ctrlKey) parts.push('mod');
  if (input.altKey) parts.push('alt');
  if (input.shiftKey) parts.push('shift');
  parts.push(input.key.toLowerCase());

  return parts.join('+');
}

function normalizeShortcut(shortcut: string) {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.pop()!;
  const order = ['mod', 'alt', 'shift'];

  return [...order.filter((modifier) => parts.includes(modifier)), key].join('+');
}

/** Finds the action for a key press, or `undefined` when none applies. */
export function resolveShortcut(
  input: KeyInput,
  shortcuts: ShortcutMap = {},
): BuilderAction | undefined {
  const pressed = normalize(input);
  const merged: Record<string, BuilderAction | false> = {};

  for (const [shortcut, action] of Object.entries({ ...DEFAULT_SHORTCUTS, ...shortcuts })) {
    merged[normalizeShortcut(shortcut)] = action;
  }

  return merged[pressed] || undefined;
}

/** Runs an action against the builder. Returns whether it did anything. */
export function runAction(builder: FormBuilder, action: BuilderAction): boolean {
  const snapshot = builder.getSnapshot();
  const { selection } = snapshot;
  const fieldIds = selection.type === 'fields' ? selection.fieldIds : [];
  const step =
    selection.type !== 'none'
      ? builder.getStep(selection.stepId)
      : snapshot.activeStepId
        ? builder.getStep(snapshot.activeStepId)
        : undefined;

  switch (action) {
    case 'undo':
      if (!snapshot.history.canUndo) return false;
      builder.history.undo();
      return true;
    case 'redo':
      if (!snapshot.history.canRedo) return false;
      builder.history.redo();
      return true;
    case 'delete':
      if (fieldIds.length > 0) {
        builder.fields.remove(fieldIds);
        return true;
      }
      if (selection.type === 'step') {
        builder.steps.remove(selection.stepId);
        return true;
      }
      return false;
    case 'duplicate':
      if (fieldIds.length > 0) {
        builder.fields.duplicate(fieldIds);
        return true;
      }
      if (selection.type === 'step') {
        builder.steps.duplicate(selection.stepId);
        return true;
      }
      return false;
    case 'copy':
      if (fieldIds.length === 0) return false;
      builder.clipboard.copy(fieldIds);
      return true;
    case 'cut':
      if (fieldIds.length === 0) return false;
      builder.clipboard.cut(fieldIds);
      return true;
    case 'paste':
      return builder.clipboard.paste().length > 0;
    case 'moveUp':
    case 'moveDown': {
      if (!step || fieldIds.length === 0) return false;

      const indexes = fieldIds.map((id) => step.fields.findIndex((field) => field.id === id));
      const first = Math.min(...indexes);
      const index = action === 'moveUp' ? first - 1 : first + 1;

      if (index < 0 || index + fieldIds.length > step.fields.length) return false;

      builder.fields.move(fieldIds, { stepId: step.id, index });
      return true;
    }
    case 'selectPrevious':
    case 'selectNext': {
      if (!step || step.fields.length === 0) return false;

      const current =
        selection.type === 'fields'
          ? step.fields.findIndex((field) => field.id === selection.anchorId)
          : -1;
      const next =
        current === -1
          ? action === 'selectNext'
            ? 0
            : step.fields.length - 1
          : current + (action === 'selectNext' ? 1 : -1);
      const field = step.fields[next];

      if (!field) return false;

      builder.select(field.id);
      return true;
    }
    case 'clearSelection':
      if (selection.type === 'none') return false;
      builder.select(null);
      return true;
  }
}

/**
 * Resolves and runs a shortcut. Returns `true` when it handled the key press, so the caller can
 * call `event.preventDefault()`.
 */
export function handleKeyDown(
  builder: FormBuilder,
  input: KeyInput,
  shortcuts?: ShortcutMap,
): boolean {
  const action = resolveShortcut(input, shortcuts);

  return action ? runAction(builder, action) : false;
}
