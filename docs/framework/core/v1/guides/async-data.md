---
title: Async definitions and defaults
description: Load step definitions on demand, prefill answers with overrides, and handle resolution failures.
order: 70
---

Async definitions load a step's structure on demand. Overrides prefill fields on
an existing structure, for example with account data or route-specific defaults.

In this guide you will:

- Choose between a loader and an override.
- Resolve a lazy step and handle failure.
- Apply instance-specific defaults.

## Load a complete step

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

async function loadLanguage() {
  return 'English';
}

const createForm = defineMultiStepForm({
  steps: {
    step1: { title: 'Contact', fields: { name: { defaultValue: '' } } },
    step2: async () => ({
      title: 'Preferences',
      fields: { language: { defaultValue: await loadLanguage() } },
    }),
  },
}).configure();

const form = createForm();
await form.stepSchema.resolveStep('step2');
const language = form.stepSchema.value.step2.fields.language.defaultValue;
```

Definitions, configuration, and factory calls remain synchronous. Creating a
schema does not invoke the loader. Before resolution, the step has no fields;
resolve it before reading them or use React's `Suspend` utility around content
that needs them.

## Handle loading and retry

Read `form.stepSchema.getStepStatus('step2')` to inspect resolution and
`form.stepSchema.getStepError('step2')` for a failure. Catch a rejected
`resolveStep` promise and show a retry action that calls `resolveStep` again.
Concurrent calls share the loader result. Successful definitions are cached per
instance; resetting uses their original defaults without re-running the loader.

## Prefill an existing structure

For the contact step above:

```ts
const prefilled = form.withOverrides({
  step1: async ({ fields }) => ({
    name: fields.name.defaultValue || 'Returning reader',
  }),
});
```

An override returns raw values keyed by field name, not replacement field
definitions. This example preserves an existing answer before applying a
fallback. Replace the fallback with your application data loader.

Use `.configure({ defaultOverrides: { ... } })` for defaults shared by instances,
and `.withOverrides({ ... })` for an instance's specific defaults. Configure the
chain before rendering; `withOverrides` returns a new schema and supersedes the
previous instance rather than mutating an already mounted interface in place.

For React, the supported order is `withOverrides` → `withForm` → `withContext`.
Every part is optional. Keep the returned schema and create components from it.

## Choose the appropriate mechanism

| Need | Mechanism |
| --- | --- |
| Fetch a whole step definition | Async step loader |
| Prefill known fields | Default or instance override |
| Recalculate a synchronous total | [Derived step state](step-state.md) |
| Fetch availability after each date change | Application query keyed by the selected date |

Do not treat a cached definition loader as a live search request. For reactive
remote data, subscribe to the relevant answer, fetch through your application,
and ignore outdated responses before applying an update.

## Next steps

- [Isolate instances](instances-and-storage.md)
- [Subscribe from React](../../../react/v1/guides/subscriptions.md)
- [Troubleshoot resolution](../../../react/v1/troubleshooting.md)
