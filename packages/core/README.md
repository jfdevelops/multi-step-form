# `@jfdevelops/multi-step-form-core`

Framework-agnostic, type-safe primitives for defining and managing multi-step forms. Use this
package when you need the schema, state, validation, and storage APIs without React.

> This package is currently in beta. Review the migration guide before upgrading from an alpha
> release.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-core
```

## Quick start

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const registrationForm = defineMultiStepForm({
  steps: {
    contact: {
      title: 'Contact details',
      fields: {
        email: {
          defaultValue: '',
          type: 'string.email',
          isRequired: true,
          placeholder: 'name@example.com',
        },
      },
    },
  },
});

registrationForm.stepSchema.value.contact.fields.email.defaultValue;
```

The definition exposes the resolved schema directly. Calling `.configure()` returns a factory for
stateful instances. Storage is optional and defaults to `localStorage` in a browser when
configured; an instance without storage remains in memory.

## Named instances

One definition can create independent form instances with separate state and storage behavior:

```ts
const createBookingForm = defineMultiStepForm({
  steps: {
    booking: {
      title: 'Booking',
      fields: { date: { defaultValue: '' } },
    },
  },
  instances: ['admin', 'client'],
}).configure({
  storage: {
    key: {
      admin: 'booking:admin',
      client: 'booking:client',
    },
    configure: { instances: ['client'] },
  },
});

const clientForm = createBookingForm({ instance: 'client' });
const adminForm = createBookingForm({ instance: 'admin' });
```

In this example, the client instance persists to storage and the admin instance remains
memory-only.

## Included APIs

- Typed step and field definitions
- Standard Schema-compatible validation
- Default and named form instances
- Optional per-instance storage
- Field metadata and step completion predicates
- Typed step state, including field-derived values
- Immutable field overrides
- Reusable typed helper functions
- Update, reset, and conditional helpers

## Documentation

- [Instances, storage, field metadata, and completion](https://github.com/jfdevelops/multi-step-form/blob/main/packages/core/docs/instances-and-storage.mdx)
- [Step state](https://github.com/jfdevelops/multi-step-form/blob/main/packages/core/docs/step-state.mdx)
- [Migrating from alpha](https://github.com/jfdevelops/multi-step-form/blob/main/packages/core/docs/migration.mdx)
- [Repository](https://github.com/jfdevelops/multi-step-form)

## License

MIT
