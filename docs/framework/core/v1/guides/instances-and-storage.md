---
title: Instances and storage
description: Isolate workflows, choose persistence keys, and configure the lifetime of form answers.
order: 40
---

Instances let one definition serve multiple independent workflows. Enable storage
when answers should survive a browser reload, and choose keys that match the
boundaries of those workflows.

In this guide you will:

- Create and reuse named instances.
- Persist selected instances to separate keys.
- Control browser and server lifetimes.
- Reset answers deliberately.

## Declare independent workflows

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const createForm = defineMultiStepForm({
  instances: ['client', 'admin'],
  steps: {
    step1: {
      title: 'Contact',
      fields: { email: { defaultValue: '' } },
    },
  },
}).configure({
  storage: {
    key: { client: 'registration:client', admin: 'registration:admin' },
    configure: { instances: ['client'] },
  },
});

const client = createForm({ instance: 'client' });
const admin = createForm({ instance: 'admin' });
```

Each instance owns answers, step state, and override resolution. Here only
`client` allocates storage; `admin` stays in memory. Repeating a factory call for
the same name returns the same instance and retains its answers. An undeclared
name throws `InvalidInstanceError`.

Without `instances`, use `createForm()` for the single `default` instance. With
names declared, every call must specify `instance`.

## Choose storage boundaries

| Configuration | Behavior |
| --- | --- |
| No `storage` option | In-memory answers |
| `storage: { key: 'registration' }` | Browser `localStorage` by default |
| A key record keyed by instance | Distinct persisted answers for each name |
| `storage.configure.instances` | Only listed names allocate storage |
| `update.updateStorage` | Additional boolean or instance predicate controlling writes |
| `storage.store` | Custom backend implementing the browser `Storage` interface |

A single string key is shared across configured instances. Separate in-memory
instances can therefore overwrite the same persisted draft. Use a key record
when their saved answers must remain independent.

An extra write gate belongs beside `storage` in `.configure()`:

```ts
update: { updateStorage: (instance) => instance === 'client' }
```

Both storage allocation and this gate must allow persistence. It does not turn
storage on for an instance that was excluded from allocation.

## Choose the right lifetime

Create and decorate a browser form once for its intended lifetime. Recreating a
factory inside every render creates independent registries; repeatedly applying
`withOverrides`, `withForm`, or `withContext` rebuilds schemas. Finish that chain
before components begin writing answers.

For server rendering, create the factory and instances within the request or
session scope. A module-level factory can otherwise share an instance across
requests. A storage key does not create an in-memory session boundary.

Without `window`, default browser storage is unavailable. The storage layer can
accept a custom `store`; `throwWhenUndefined` enables strict failure for missing
browser storage rather than relying on the default unavailable-storage behavior.
Access `sessionStorage` or `localStorage` only in browser code.

## Restart a workflow

```ts
client.stepSchema.value.step1.reset();
```

Reset through the runtime instead of assigning original values by hand. For a
whole workflow, reset each relevant step. Resets restore defaults and derived
state; a request failure should normally retain answers so the reader can retry.
See [scoped resets](updates-and-helpers.md#reset-selected-values) for clearing only
part of a step.

## Next steps

- [Prefill with overrides](async-data.md)
- [Write updates and shared helpers](updates-and-helpers.md)
- [Persist builder definitions separately](../../../react/v1/builder/persistence.md)
