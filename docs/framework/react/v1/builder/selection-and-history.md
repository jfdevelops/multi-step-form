---
title: Selection, history, and shortcuts
description: Support multi-selection, undoable compound edits, clipboard actions, and keyboard commands.
order: 90
---

Selection identifies what the editor's inspector and toolbar operate on. History
lets authors explore changes safely, while clipboard and shortcuts make repeated
editing practical.

In this guide you will:

- Select one or several fields.
- Group related edits into one undo step.
- Copy fields between steps.
- Expose keyboard actions without intercepting text editing.

## Select by editor ID

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder();
const firstId = builder.fields.add({ type: 'text', key: 'firstName' });
const lastId = builder.fields.add({ type: 'text', key: 'lastName' });

builder.select(firstId);
builder.select(lastId, 'toggle');
```

`replace` is the default selection mode. `toggle` adds or removes a field, and
`range` extends from the anchor. `builder.select(null)` clears the selection.
Snapshots distinguish `none`, a selected `step`, and selected `fields`; narrow
that union before reading `fieldIds`.

## Group a compound change

```ts
builder.history.transaction(() => {
  builder.fields.update(firstId, { isRequired: true });
  builder.fields.update(lastId, { isRequired: true });
});

builder.history.undo();
builder.history.redo();
```

A transaction records one undo step and notifies subscribers once. History also
merges edits to the same property inside its configured merge window. Configure
`history.limit` and `history.mergeWindowMs` when creating the builder to match
your editor's interaction style.

Read snapshot `history.canUndo` and `history.canRedo` to disable unavailable
actions. Replacing a whole definition with `load` clears history, so it is not a
substitute for undoing a field change.

## Reuse fields through the clipboard

```ts
builder.clipboard.copy([firstId, lastId]);
const destinationId = builder.steps.add({ title: 'Additional contact' });
const pastedIds = builder.clipboard.paste({ stepId: destinationId, index: 0 });
```

The builder clipboard stores field definitions, not an operating-system text
clipboard. Paste produces new IDs and usable keys in the destination. Without
explicit IDs, copy and cut use the selected fields. The snapshot's clipboard
field count lets the UI explain whether paste is available.

## Add actions to a React toolbar

Inside `FormBuilder`:

```tsx
import { ActionButton } from '@jfdevelops/react-multi-step-form-builder';

export function HistoryControls() {
  return (
    <div aria-label='Edit history'>
      <ActionButton action='undo'>Undo</ActionButton>
      <ActionButton action='redo'>Redo</ActionButton>
      <ActionButton action='duplicate'>Duplicate selection</ActionButton>
    </div>
  );
}
```

Default shortcuts include Mod+Z for undo, Mod+Shift+Z or Mod+Y for redo,
Mod+C/X/V for clipboard, Mod+D for duplicate, and Alt+Arrow for movement.
`mod` accepts Control or Command.

Override shortcuts through `FormBuilder`'s `shortcuts` prop; map a shortcut to
`false` to disable it. For a custom core UI, call `handleKeyDown` and prevent the
browser default only when it returns true. Keep editor shortcuts scoped so
Backspace or Delete inside a property input edits text rather than removing a
field. Retain visible buttons for actions that also have shortcuts.

## Next steps

- [Move fields with drag and drop](drag-and-drop.md)
- [Design inspector controls](inspector.md)
- [Persist editing sessions](persistence.md)
