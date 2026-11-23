---
title: Overview
description: Define typed forms, manage independent answers, and connect the runtime to an interface.
order: 0
---

The core runtime manages multi-step form data without React. Define fields and
completion rules once, create an instance, then update and subscribe to its state
from your application.

## Create a runtime form

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: { email: { defaultValue: '' } },
      isComplete: ({ email }) => email.includes('@'),
    },
  },
}).configure();

const form = createForm();
form.stepSchema.value.step1.update({
  fields: ['fields.email.defaultValue'],
  updater: 'reader@example.com',
});

const email = form.stepSchema.value.step1.fields.email.defaultValue;
const isComplete = form.stepSchema.isStepComplete('step1');
```

`defaultValue` on a resolved field holds the current answer. Update methods keep
derived state, completion, subscriptions, and configured storage synchronized.
Do not mutate the resolved object directly.

## Separate definition, configuration, and answers

| Layer | Responsibility |
| --- | --- |
| `defineMultiStepForm({ steps, instances })` | Declare field shapes, step rules, optional instance names |
| `.configure(options)` | Set storage, default overrides, and naming behavior; return a factory |
| `createForm()` | Create or retrieve the default instance |
| `createForm({ instance: 'client' })` | Create or retrieve a declared named instance |
| `form.stepSchema.value` | Read resolved steps, fields, state, and bound utilities |

The definition is itself a usable schema, but its state is independent of factory
instances. Pick the object that owns the workflow and consistently read and write
through it. Build configuration chains before rendering or updating answers.

## Observe updates

```ts
const unsubscribe = form.subscribe(() => {
  const value = form.stepSchema.value.step1.fields.email.defaultValue;
  console.log('Email changed:', value);
});

// Call when the consuming view is disposed.
unsubscribe();
```

React consumers should use the React integration's subscription hooks and
components instead of implementing an effect that copies these answers.

## Choose runtime or builder APIs

Runtime definitions describe the form your application runs. The separate builder
accepts JSON definitions, supports editing, and compiles or generates runtime
definitions. Saving a builder does not save a visitor's answers.

| Task | Guide |
| --- | --- |
| Create independent copies and persist answers | [Instances and storage](guides/instances-and-storage.md) |
| Change values, reset, and share operations | [Updates and helpers](guides/updates-and-helpers.md) |
| Compose execution-time rules | [Conditions](guides/conditions.md) |
| Compute summaries and dependent state | [Step state](guides/step-state.md) |
| Load definitions or defaults asynchronously | [Async data](guides/async-data.md) |
| Keep inferred field and step types | [TypeScript](typescript.md) |
| Edit and export form definitions | [Builder documentation](../../react/v1/builder/overview.md) |
| Find value, path, casing, storage, and diagnostic helpers | [Core utilities](utilities/overview.md) |

## Next steps

- [Install the runtime](../../react/v1/installation.md)
- [Build a React interface](../../react/v1/quick-start.md)
- [Configure instances and storage](guides/instances-and-storage.md)
