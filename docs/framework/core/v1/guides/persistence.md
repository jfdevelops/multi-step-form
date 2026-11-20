---
title: Save builder definitions
description: Persist editable definitions and restore them into a builder with the same registry.
order: 30
---

Builder persistence saves the form being designed. Configure it separately from
runtime answer persistence, which stores the values entered into a running form.

In this guide you will:

- Save an editor definition.
- Restore it by form ID.
- Handle save errors and revisions.

## Save and restore in memory

```ts
import {
  createFormBuilder,
  createMemoryStorage,
} from '@jfdevelops/multi-step-form-builder-core';

const storage = createMemoryStorage();
const builder = createFormBuilder({ storage });

builder.fields.add({ type: 'text', key: 'name' });
await builder.save();

const formId = builder.toJSON().id;
const restored = createFormBuilder({ storage });
const found = await restored.loadFromStorage(formId);
```

`found` is false when storage has no definition for that ID. Memory storage lasts
only as long as the storage object. Reuse the original registry when restoring a
definition with custom field types or adapters.

## Persist in a browser

```ts
import {
  createFormBuilder,
  createLocalStorageAdapter,
} from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder({
  storage: createLocalStorageAdapter({ prefix: 'workshop-builder:' }),
  autosave: { debounceMs: 500 },
});
```

Use this configuration in a browser with local storage available. Keep the form
ID so a later editor session can call `loadFromStorage(formId)`. Autosave requires
a storage adapter. For explicit saves, catch rejected `builder.save()` promises
and show a useful retry action. The snapshot's `status` exposes dirty, saving,
last-save, and error state.

## Store definitions on a server

Implement `BuilderStorage` with `save(definition, context)` and optional
`load(formId)`. The save context includes `baseRevision`, so your server can
reject stale writes. Return the stored revision from `save` to synchronize the
builder. The local storage adapter does not provide server-side conflict control.

Validate data received from outside your application before treating it as a
definition. Storage and registry configuration are separate: restoring JSON does
not restore executable callbacks or adapter implementations.

## Next steps

- [Create and export definitions](definitions.md)
- [Choose a builder validator](validators.md)
