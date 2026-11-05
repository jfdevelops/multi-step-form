# Multi-Step Form

Type-safe primitives for building multi-step forms in TypeScript. The project provides a
framework-agnostic core package and React bindings, with typed fields, validation, independent
form instances, optional browser persistence, and per-step state.

> The current releases are beta versions. Review the migration guides before upgrading from an
> alpha release.

## Packages

| Package | Purpose |
| --- | --- |
| [`@jfdevelops/multi-step-form-core`](./packages/core/README.md) | Framework-agnostic schema, state, validation, and storage APIs |
| [`@jfdevelops/react-multi-step-form`](./packages/react/README.md) | React components, hooks, context, and selectors built on the core package |
| [`@jfdevelops/react-multi-step-form-tanstack`](./packages/react-tanstack-form/README.md) | Native TanStack Form integration for React |

Install the React package for a React application:

```bash
pnpm add @jfdevelops/react-multi-step-form
```

Install the core package directly when you do not need React:

```bash
pnpm add @jfdevelops/multi-step-form-core
```

The same packages can be installed with npm, Yarn, or another compatible package manager.

## Quick start

Define the steps, configure an instance, and create a component for a step:

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

Calling `.configure()` returns a factory. With no `instances` option, calling that factory with no
arguments creates or retrieves the default instance. Storage is optional; when a storage key is
configured in a browser, the default backend is `localStorage`. Without storage configuration,
the instance remains in memory.

## Capabilities

- Field and step types inferred from a single form definition
- Standard Schema-compatible validation
- Reactive field components, hooks, and selectors for React
- Named, isolated instances created from one shared definition
- Optional per-instance storage with server-rendering-safe behavior
- Async field overrides and reusable typed helper functions
- Field metadata including labels, placeholders, required state, and error messages
- Step completion predicates and typed per-step state, including derived state

## Documentation

- [Core documentation](./packages/core/docs/README.md)
  - [Instances, storage, field metadata, and completion](./packages/core/docs/instances-and-storage.mdx)
  - [Step state](./packages/core/docs/step-state.mdx)
  - [Migrating from alpha](./packages/core/docs/migration.mdx)
- [React documentation](./packages/react/docs/README.md)
  - [Builder order and React integration](./packages/react/docs/instances-and-storage.mdx)
  - [Migrating from alpha](./packages/react/docs/migration.mdx)
- [React example](./examples/react-basic)
- [TanStack Form integration guide](./packages/react-tanstack-form/docs/integration.mdx)
- [TanStack Form example](./examples/react-tanstack-form)

## Development

This repository is a pnpm workspace. Development currently targets Node.js 24 and pnpm 10.

```bash
# Install workspace dependencies
pnpm install

# Build every workspace package and example
pnpm build

# Run the package test suites
pnpm test:packages

# Type-check the published packages
pnpm typecheck:packages

# Start package builds in watch mode
pnpm watch

# Run the React example at http://localhost:3000
pnpm --filter react-basic dev
```

The repository is organized as follows:

```text
packages/
  core/          Framework-agnostic package
  react/         React bindings
  react-tanstack-form/ TanStack Form adapter
examples/
  react-basic/   Vite example application
  react-tanstack-form/ Minimal TanStack Form example
```

## License

MIT
