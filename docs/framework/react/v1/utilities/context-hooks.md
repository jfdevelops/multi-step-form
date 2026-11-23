---
title: Context hooks and display helpers
description: Read a schema directly or through bound hooks and customize missing-data, progress, and restart UI.
order: 10
---

Context helpers create reactive views of one form instance. They do not select
the active instance for factory-level shared helpers.

In this guide you will:

- Choose bound or explicit-schema data hooks.
- Handle potentially absent step data.
- Customize progress and missing-data text.
- Inspect whether a persisted draft can be restarted.

## Bind hooks to one schema

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

const form = defineMultiStepForm({
  steps: {
    step1: { title: 'Contact', fields: { email: { defaultValue: '' } } },
  },
}).configure()().withContext();

const hooks = form.context;

export function ContactSummary() {
  const email = hooks.useMultiStepFormData((schema) =>
    schema.stepSchema.value.step1.fields.email.defaultValue,
  );

  return <p>{email}</p>;
}
```

`.withContext()` returns a new schema with bound helpers on `.context`; keep
that final returned schema for both components and hooks. No extra provider is
required for these bound runtime hooks.

The package also exports `createMultiStepFormContext`, the lower-level context
constructor. Use `.withContext()` for inferred factory instances: it preserves
their concrete configuration and field inference. Custom schema integrations
using the constructor must satisfy its configuration and resolved-value generic
constraints explicitly.

The package-level `useMultiStepFormData(form, selector)` accepts the schema
explicitly. Both forms also support a target-step option or an entire-schema read.
Use the callback overload for a component that displays one value.

## Handle step data availability

```tsx
export function ContactTitle() {
  const { data, hasData, NoCurrentData } = hooks.useCurrentStepData({ targetStep: 'step1' });

  if (!hasData) {
    return <NoCurrentData />;
  }

  return <h2>{data.title}</h2>;
}
```

`hasData` narrows the result. `isDataGuaranteed: true` removes the optional-data
branch from the type; use it only when your owning flow guarantees availability.
It is not a lazy-step loader or substitute for a resolution/error boundary.

Use `notFoundMessage` for an inline missing-data renderer, or build a reusable
component with `withNoStepDataFound({ targetStep }, render)`. These helpers use
render callbacks with their context as the first argument and custom props as
the second.

## Customize progress text

```tsx
const ProgressLabel = hooks.withProgressText({ targetStep: 'step1' }, ({ totalSteps }) => (
  <span>Contact details, first of {totalSteps} steps</span>
));

export function ContactProgress() {
  const { value, maxProgressValue } = hooks.useProgress({ targetStep: 'step1' });

  return <div><ProgressLabel /><progress aria-label='Progress' value={value} max={maxProgressValue} /></div>;
}
```

`useProgress` also accepts `totalSteps`, `maxProgressValue`, and
`progressTextTransformer`. It measures numeric step position, not completion.
Create reusable display components outside render to keep component identity stable.

## Inspect restart availability

`useCanRestartForm()` checks the stored document and returns whether it contains
data. Its callback option transforms that boolean for a custom eligibility rule.
It does not reset anything, and an in-memory-only form need not have a saved draft.

Use explicit step resets for restarting live answers and storage removal when a
saved draft should disappear. Explain that distinction in your restart action
instead of treating this hook as a reset operation.

## Next steps

- [Storage operations](../../../core/v1/utilities/storage-and-lifecycle.md)
- [Step render utilities](component-utilities.md)
- [Progress and navigation](../guides/navigation-and-review.md)
