# `@jfdevelops/react-multi-step-form-tanstack`

Native TanStack Form integration for `@jfdevelops/react-multi-step-form`.

## Installation

```bash
pnpm add @jfdevelops/react-multi-step-form @jfdevelops/react-multi-step-form-tanstack @tanstack/react-form
```

## Usage

Configure the integration once and single-step components receive it by default:

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';
import { tanstackForm } from '@jfdevelops/react-multi-step-form-tanstack';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: { email: { defaultValue: '' as string } },
    },
  },
}).configure({
  formLibrary: tanstackForm(),
});

const formSchema = createForm();

export const Contact = formSchema.stepSchema.value.step1.createComponent({
  render: ({ form, Selector }) => (
    <>
      <form.Field name="email">
        {(field) => (
          <input
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        )}
      </form.Field>
      <Selector selector={(context) => context.step1.fields.email.defaultValue} />
    </>
  ),
});
```

The adapter owns synchronization, so the TanStack field handler is the only
`onChange` needed. Existing multi-step-form `Field`, `Selector`, and hooks remain
available in the same render callback.

Pass `formLibrary: false` to a component that does not need a TanStack form.

See [the integration guide](./docs/integration.mdx) and the
[minimal example](../../examples/react-tanstack-form).
