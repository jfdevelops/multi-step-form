---
title: Create a React form
description: Define a typed step and render a field bound to a form instance.
order: 20
---

Define a form once and create instances from its configured factory. React step
components bind fields to an instance and subscribe to its state.

In this guide you will:

- Define a contact step.
- Create a form instance.
- Bind an input to a typed field.

## Define and render a step

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact details',
      fields: {
        email: {
          defaultValue: '',
          type: 'string.email',
          isRequired: true,
          placeholder: 'name@example.com',
        },
      },
      isComplete: ({ email }: { email: string }) => email.includes('@'),
    },
  },
}).configure({});

const form = createForm();

export const ContactStep = form.stepSchema.value.step1.createComponent({
  render: ({ Field }) => (
    <Field name='email'>
      {({ defaultValue, label, onInputChange, placeholder }) => (
        <label>
          {label}
          <input
            type='email'
            value={defaultValue}
            placeholder={placeholder}
            onChange={(event) => onInputChange(event.target.value)}
          />
        </label>
      )}
    </Field>
  ),
});
```

Render `<ContactStep />` in your application. `Field` infers the permitted field
name and value from the definition. `onInputChange` writes back to this instance.
The completion predicate here is a minimal example; use validation appropriate
to your application's data before accepting a submission.

## Configure persistence and instances

The example stays in memory. Pass `storage: { key: 'registration-form' }` to
`.configure()` to enable browser persistence, whose default backend is
`localStorage`. Use distinct storage keys for forms whose answers must remain
separate.

Calling `.configure()` returns a factory. With no `instances` option, calling
the factory without arguments creates or retrieves the default instance. Named
instances let one definition serve independent workflows; see the
[instance and storage guide](https://github.com/jfdevelops/multi-step-form/blob/3005838d05ef1ea26b616e0c4feec6a046ddc09b/packages/core/docs/instances-and-storage.mdx).

## Extend the React integration

The optional instance builders follow this order:
`.withOverrides(...)`, `.withForm(...)`, then `.withContext()`.
Use overrides for initial values, a shared form component for layout, and context
for hooks that need the active instance. The
[React integration guide](https://github.com/jfdevelops/multi-step-form/blob/3005838d05ef1ea26b616e0c4feec6a046ddc09b/packages/react/docs/instances-and-storage.mdx)
shows provider wiring and navigation.

## Next steps

- [Use TanStack Form inside a step](https://github.com/jfdevelops/multi-step-form/blob/3005838d05ef1ea26b616e0c4feec6a046ddc09b/packages/react-tanstack-form/docs/integration.mdx)
- [Add per-step state](https://github.com/jfdevelops/multi-step-form/blob/3005838d05ef1ea26b616e0c4feec6a046ddc09b/packages/core/docs/step-state.mdx)
- [Build a form editor](guides/form-builder.md)
