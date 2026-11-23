---
title: TanStack Form
description: Use native TanStack fields, subscriptions, and validation timing inside typed multi-step components.
order: 60
---

The adapter supplies a native TanStack form inside a single-step component.
Use it when you need TanStack field state, validation events, or existing controls
while retaining the multi-step instance as the shared answer store.

In this guide you will:

- Configure the adapter once.
- Render a native field.
- Choose validation timing.
- Mix native and multi-step utilities.

## Configure the definition

[Install the runtime and adapter](../installation.md#install-a-form-runtime), then
create the form:

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';
import { tanstackForm } from '@jfdevelops/react-multi-step-form-tanstack';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: { email: { defaultValue: '' } },
      isComplete: ({ email }) => email.includes('@'),
    },
  },
}).configure({
  formLibrary: tanstackForm({
    formOptions: ({ validation }) => ({
      validators: validation ? { onChange: validation } : undefined,
    }),
  }),
});

const registration = createForm();
```

The adapter does not automatically assign a step validator to a TanStack event.
The callback above maps an available validator to `onChange`. Choose `onBlur`,
`onSubmit`, or another native slot to match your feedback policy. `isComplete`
remains the multi-step readiness rule; it is not a replacement for native
field-level messages.

## Render a native field

```tsx
export const ContactStep = registration.stepSchema.value.step1.createComponent({
  render: function ContactStep({ form }) {
    return (
      <form onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}>
        <form.Field name='email'>
          {(field) => (
            <label>
              Email
              <input
                type='email'
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </label>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.email}>
          {(email) => <output>{email}</output>}
        </form.Subscribe>
      </form>
    );
  },
});
```

`form.Field`, `form.Subscribe`, and `form.handleSubmit` are native APIs. Configure
native submission behavior through `formOptions` as needed. The HTML form above
is the only form around its controls; omit it if your shared layout already
provides one.

## Mix field systems deliberately

Single-step components receive the native form by default when an adapter is
configured. They also retain `Field`, `Selector`, `useSelector`, and `useStep`.
Both field systems read and write the same step values, so a native field can
update a review rendered with `Selector`.

Set `formLibrary: false` on a component that only needs multi-step utilities.
Multi-step summaries should select their steps and use those utilities instead
of expecting a native form combining every step.

The adapter re-exports TanStack Form APIs, including `useForm`. Prefer the
configured binding when editing a step; manually creating an unrelated form
creates another state owner unless you explicitly synchronize it.

## Next steps

- [Validation and submission](validation-and-submission.md)
- [Share form layout](subscriptions.md#configure-shared-form-markup)
- [Build a review](navigation-and-review.md)
