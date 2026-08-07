# Multi-Step Form

A type-safe, framework-agnostic multi-step form solution with React bindings.

## Features

- 🎯 **Type-Safe**: Full TypeScript support with intelligent type inference
- 🔄 **Framework Agnostic Core**: Core package works with any JavaScript framework
- ⚛️ **React Integration**: First-class React support with hooks and context
- 💾 **Persistent Storage**: Automatic localStorage persistence to save form progress
- ✅ **Validation**: Built-in validation using [Standard Schema](https://standardschema.dev/)
- 🎨 **Customizable**: Flexible schema configuration with custom form rendering
- 📦 **Monorepo**: Organized as a monorepo with separate core and React packages

## Installation

```bash
pnpm install @jfdevelops/multi-step-form @jfdevelops/react-multi-step-form
```

Or using npm:

```bash
npm install @jfdevelops/multi-step-form @jfdevelops/react-multi-step-form
```

## Quick Start

### 1. Create a Form Schema

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Personal Information',
      fields: {
        firstName: {
          defaultValue: '',
        },
        lastName: {
          defaultValue: '',
        },
        email: {
          defaultValue: '',
          type: 'string.email',
        },
      },
    },
    step2: {
      title: 'Account/Preferences',
      fields: {
        username: {
          defaultValue: '',
        },
        password: {
          defaultValue: '',
        },
        language: {
          defaultValue: 'en',
          label: 'Preferred Language',
        },
      },
    },
    step3: {
      title: 'Confirmation',
      fields: {
        newsLetterOptIn: {
          defaultValue: false,
          type: 'boolean.switch',
        },
      },
    },
  },
}).configure({
  storage: {
    key: 'MultiStepFormBasicExample',
  },
});

export const schema = createForm()
  .withForm({
    alias: 'MyCoolCustomForm',
    enabledForSteps: ['step1', 'step2'],
    render(
      { id },
      {
        title,
        description,
        ...props
      }: ComponentPropsWithRef<'form'> & {
        title: string;
        description?: string;
      }
    ) {
      return (
        <div className='flex flex-col gap-y-4'>
          <div className='flex flex-col gap-y-2'>
            <h1 className='font-bold text-xl'>{title}</h1>
            {description && <p>{description}</p>}
          </div>
          <form id={id} {...props} />
        </div>
      );
    },
  })
  .withContext();

export const {
  useMultiStepFormData,
  useCurrentStepData,
  useProgress,
  useCanRestartForm,
} = schema.context;

export type StepNumber = keyof MultiStepFormSchema.resolvedStep<typeof schema>;
```

`defineMultiStepForm({ steps }).configure({ storage })` is a single-instance form by default — see
the [beta docs](#beta-instances--storage) below for named instances (e.g. a persisted public form
alongside a memory-only admin form) sharing this same definition. `createMultiStepFormSchema` (the
pre-beta factory) still works the same way it always has, minus step-level `overrides` (moved to
`.withOverrides(...)` — see the migration guides linked below).

### 2. Create step specific components

```tsx
import { schema } from './schema';

export const Step1 = schema.stepSchema.value.step1.createComponent(
  function Step1({ ctx, MyCoolCustomForm, Field: FieldComponent }) {
    const { title } = ctx.step1;

    return (
      <MyCoolCustomForm title={title}>
        <FieldSet>
          <FieldComponent name='firstName'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='John'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
          <FieldComponent name='lastName'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='Smith'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
          <FieldComponent name='email'>
            {({ defaultValue, label, onInputChange }) => (
              <Field>
                <FieldLabel htmlFor={label}>{label}</FieldLabel>
                <Input
                  id={label}
                  defaultValue={defaultValue}
                  placeholder='johnsmith@gmail.com'
                  type='email'
                  onChange={(e) => onInputChange(e.target.value)}
                />
              </Field>
            )}
          </FieldComponent>
        </FieldSet>
      </MyCoolCustomForm>
    );
  }
);

// more step components
```

### 3. Create a "Step Layout"

```tsx
import { useCurrentStepData, type StepNumber } from './schema';
import { Step1, Step2 } from './steps';

export function StepLayout({
  currentStep: stepNumber,
}: {
  currentStep: StepNumber;
}) {
  const { NoCurrentData, hasData } = useCurrentStepData({
    targetStep: stepNumber,
  });

  if (!hasData) {
    return <NoCurrentData />;
  }

  const steps = {
    step1: <Step1 />,
    step2: <Step2 />,
    step3: <Step3 />,
  };

  return steps[currentStep];
}
```

## Beta: instances & storage

Starting with the `beta` pre-releases, `defineMultiStepForm` lets one form definition power
several independent, named instances — e.g. a persisted public/client form and a memory-only
internal/admin form that share the same steps and helper functions:

```ts
const createBookingForm = defineMultiStepForm({
  steps: { /* ... */ },
  instances: ['admin', 'client'],
}).configure({
  storage: { key: { client: 'booking:client', admin: 'booking:admin' }, configure: { instances: ['client'] } },
});

const clientForm = createBookingForm({ instance: 'client' }); // persists to storage
const adminForm = createBookingForm({ instance: 'admin' }); // memory-only
```

See the per-package docs for the full guide — instances, per-instance storage, shared
`createHelperFn`, `withOverrides`, field metadata (`isRequired`/`placeholder`/`errorMessage`),
step `isComplete`, and a type cookbook. Migrating from alpha has its own doc, separate from the
feature guide:

- [`packages/core/docs`](./packages/core/docs) — the framework-agnostic API
  ([migration](./packages/core/docs/migration.mdx), [instances & storage](./packages/core/docs/instances-and-storage.mdx))
- [`packages/react/docs`](./packages/react/docs) — the React builder order & provider wiring
  ([migration](./packages/react/docs/migration.mdx), [instances & storage](./packages/react/docs/instances-and-storage.mdx))

## Packages

### `@jfdevelops/multi-step-form` (Core)

The framework-agnostic core package that provides:

- Schema definition and validation
- Step management
- Storage abstraction
- Observable patterns

### `@jfdevelops/react-multi-step-form` (React)

React-specific bindings that provide:

- React hooks (`useMultiStepFormData`, `useCurrentStepData`, etc.)
- Context API integration
- Form component configuration

## Development

This project uses pnpm workspaces. To get started:

```bash
# Install all dependencies
pnpm install

# Build all packages
pnpm build

# Run in watch mode
pnpm watch

# Run the example app
pnpm --filter react-basic dev

# Run tests
pnpm test
```

### Project Structure

```
multi-step-form/
├── packages/
│   ├── core/          # Framework-agnostic core package
│   └── react/          # React-specific bindings
├── examples/
│   └── react-basic/    # Example React application
└── package.json        # Root package configuration
```

## Storage

Form data is persisted to localStorage using the key specified in `.configure({ storage })`. The
storage is reactive and updates automatically when form data changes. With `defineMultiStepForm`,
storage is opt-in per instance (see the [beta docs](#beta-instances--storage)) — a form with no
`storage` configured is memory-only.

## TypeScript Support

The library provides full TypeScript support with type inference:

```tsx
type StepNumber = keyof MultiStepFormSchema.resolvedStep<typeof schema>;
type Step1Data = MultiStepFormSchema.getData<typeof schema, 'step1'>;
```

## License

MIT

## Author

Joey Finkel
