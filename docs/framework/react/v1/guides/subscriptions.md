---
title: Subscriptions and shared layout
description: Read reactive answers with selectors and hooks, and share form markup through a configured component.
order: 30
---

Subscriptions keep the interface aligned with the form store. Select only the
data a component displays instead of copying answers into a second state store.

In this guide you will:

- Read answers with a bound hook.
- Limit reactive rendering with selectors.
- Share layout through `withForm`.

## Read the instance with bound hooks

Continue with the schema from the [walkthrough](../quick-start.md), which calls
`withContext()` before exporting its instance:

```tsx
import { registration } from './registration';

const { useMultiStepFormData } = registration.context;

export function EmailSummary() {
  const email = useMultiStepFormData((schema) =>
    schema.stepSchema.value.step1.fields.email.defaultValue,
  );

  return <p>Confirmation email: {email}</p>;
}
```

The hook is bound to this schema. `withContext()` provides these hooks; it does
not require an additional provider around the tree. Other context providers used
by your input components remain your application's responsibility.

`useMultiStepFormData({ targetStep: 'step1' })` reads one step. The callback form
selects data from the schema. Without arguments, the hook returns the schema.

## Use a selector inside a created component

```tsx
const EmailSummary = registration.createComponent({
  stepData: ['step1'],
  render: function EmailSummary({ Selector }) {
    return (
      <Selector selector={(steps) => steps.step1.fields.email.defaultValue}>
        {(email) => <output>{email}</output>}
      </Selector>
    );
  },
});
```

`Selector` updates its own rendered content. The bound `useSelector` utility
updates the component calling the hook. Selectors supplied here receive step
context (`steps.step1`); the context hook's callback receives the full schema
(`schema.stepSchema.value.step1`).

A direct read outside a subscription gives the current value but does not make
React rerender. Use direct reads in event handlers for execution-time decisions,
and reactive reads for visible summaries, completion indicators, and buttons.

## Configure shared form markup

Before calling `withContext`, an instance can define a reusable `Form` component:

```tsx
import type { ComponentProps } from 'react';

const form = createRegistrationForm()
  .withForm({
    render: function RegistrationLayout({ id }, props: ComponentProps<'form'>) {
      return <form {...props} id={id}>{props.children}</form>;
    },
  })
  .withContext();
```

Single-step component render utilities then include the configured `Form`.
Use `<Form onSubmit={...}>...</Form>` to share markup. Keep one HTML form around
the controls; do not nest this inside another `<form>`.

Build the chain once: optional `withOverrides`, optional `withForm`, then optional
`withContext`. These return rebuilt schemas. Create field components and retain
hooks from the final returned schema.

## Next steps

- [Build navigation and progress](navigation-and-review.md)
- [Load asynchronous data](../../../core/v1/guides/async-data.md)
- [Understand field bindings](fields-and-components.md)
