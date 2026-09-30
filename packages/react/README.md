# `@jfdevelops/react-multi-step-form`

React bindings for `@jfdevelops/multi-step-form-core`. The package adds typed field components,
selectors, hooks, context, and configurable form components to the framework-agnostic core API.

> This package is currently in beta. Review the migration guide before upgrading from an alpha
> release.

## Installation

```bash
pnpm add @jfdevelops/react-multi-step-form
```

## Quick start

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

const form = defineMultiStepForm({
  steps: {
    contact: {
      title: 'Contact details',
      fields: {
        email: {
          defaultValue: '',
          type: 'string.email',
          isRequired: true,
          placeholder: 'name@example.com',
          errorMessage: 'Enter a valid email address',
        },
      },
      isComplete: ({ email }) => email.includes('@'),
    },
  },
})
  .configure({
    storage: { key: 'registration-form' },
  })();

export const ContactStep = form.stepSchema.value.contact.createComponent({
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

The component factory binds the rendered field to the form instance. Field metadata and update
helpers are inferred from the definition, and the component subscribes to the relevant form
state.

## Builder API

A configured instance can be extended with optional overrides, a shared form component, and
React context. The supported order is:

```tsx
const form = createForm()
  .withOverrides({
    contact: async () => ({ email: 'name@example.com' }),
  })
  .withForm({
    render: ({ id }, props) => <form id={id} {...props} />,
  })
  .withContext();

export const { useCurrentStepData, useMultiStepFormData, useProgress } =
  form.context;
```

Each builder is optional. Use only the layers required by the application.

## Included APIs

- The complete `@jfdevelops/multi-step-form-core` definition and instance API
- Typed step and field components
- Schema-level and step-level component factories
- Reactive selectors for primitive and object values
- Context-backed form and progress hooks
- Configurable form components
- Named, isolated instances with optional persistence
- Typed field metadata, completion predicates, and step state

## Documentation

- [React builder order and instance integration](https://github.com/jfdevelops/multi-step-form/blob/main/packages/react/docs/instances-and-storage.mdx)
- [React migration guide](https://github.com/jfdevelops/multi-step-form/blob/main/packages/react/docs/migration.mdx)
- [Core concepts and API](https://github.com/jfdevelops/multi-step-form/tree/main/packages/core/docs)
- [React example](https://github.com/jfdevelops/multi-step-form/tree/main/examples/react-basic)
- [Repository](https://github.com/jfdevelops/multi-step-form)

## License

MIT
