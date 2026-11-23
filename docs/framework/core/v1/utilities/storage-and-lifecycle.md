---
title: Storage and schema lifecycle
description: Inspect persisted drafts, distinguish stored data from live answers, and manage schema subscriptions and mounts.
order: 60
---

Storage methods operate on the saved draft; schema methods operate on the live
form. Use their explicit boundaries when implementing restart, import, or a
custom host integration.

In this guide you will:

- Inspect and clear a persisted draft.
- Understand explicit storage writes.
- Subscribe and clean up listeners.
- Distinguish mounting from answer resets.

## Inspect the instance's storage

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const form = defineMultiStepForm({
  steps: {
    step1: { title: 'Contact', fields: { email: { defaultValue: '' } } },
  },
}).configure({ storage: { key: 'contact-draft' } })();

const exists = form.storage.hasKey();
const saved = form.storage.get();
```

`hasKey` checks whether the key is present. `get` parses the stored document,
restoring supported date metadata. Invalid JSON is removed and yields no saved
value so a malformed draft does not prevent normal initialization.

`DEFAULT_STORAGE_KEY` names the fallback storage key used by low-level schema
construction. Factory configuration should supply a deliberate application key.

## Remove a draft deliberately

```ts
form.storage.remove();
```

Removing persisted data does not reset live field values or notify every mounted
control of a new answer. Use runtime resets to change live values. If resetting
automatically persists defaults, decide whether to remove the saved key after
that reset when your desired outcome is “no draft exists.”

Conversely, `form.storage.add(valueOrUpdater)` writes a saved document; it is not
a replacement for updating answers through the runtime. `stepSchema.sync()`
reconciles runtime data with storage and restored metadata. Do not use manual
storage writes as a second ongoing answer-update channel.

## Construct storage for an adapter

`MultiStepFormStorage` accepts `data`, a key, an optional `Storage` backend, and
`throwWhenUndefined`. It exposes the same `get`, `add`, `hasKey`, and `remove`
operations. An updater passed to `add` receives the storage object's configured
`data`, not a fresh backend read, so it is not an atomic transaction.

Browser defaults require `window.localStorage`. An unavailable backend produces
no normal storage actions unless stricter failure is requested. Provide a
custom backend for other environments. The factory can also allocate inert
storage for instances excluded from persistence.

## Subscribe and release ownership

```ts
const stop = form.subscribe(({ value }) => {
  console.log(value.step1.fields.email.defaultValue);
});

const releaseMount = form.mount();
const mounted = form.isMounted();
releaseMount();
stop();
```

`getSnapshot()` on either schema returns that schema object. Read its current
value properties rather than treating the object as a cloned snapshot.
`mount` reference-counts ownership and returns a
cleanup; `unmount` releases ownership and `isMounted` reports whether owners
remain. These are host lifecycle tools, not “clear answers” operations.

`MultiStepFormSchema` and `MultiStepFormStepSchema` are the public classes behind
these surfaces. Prefer configured factories for ordinary application forms so
instance allocation and persistence gates stay coordinated.

## Next steps

- [Instance and persistence configuration](../guides/instances-and-storage.md)
- [Typed storage boundaries](type-utilities.md)
- [React restart and data hooks](../../../react/v1/utilities/context-hooks.md)
