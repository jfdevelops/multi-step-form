---
title: Installation
description: Choose packages for a React form, a form editor, or a framework-independent application.
order: 10
---

Choose the runtime packages to render forms or the builder packages to let users
design forms. The builder can export definitions as application source code.

## Choose a package

| Package | Use it to |
| --- | --- |
| `@jfdevelops/multi-step-form-core` | Define and manage forms without React |
| `@jfdevelops/react-multi-step-form` | Render typed fields and steps in React |
| `@jfdevelops/react-multi-step-form-tanstack` | Use native TanStack Form APIs inside React steps |
| `@jfdevelops/multi-step-form-builder-core` | Edit JSON definitions and generate TypeScript |
| `@jfdevelops/react-multi-step-form-builder` | Compose a headless React editor |

## Install a form runtime

For an existing React application:

```npm
npm i @jfdevelops/react-multi-step-form
```

```pnpm
pnpm add @jfdevelops/react-multi-step-form
```

```yarn
yarn add @jfdevelops/react-multi-step-form
```

```bun
bun add @jfdevelops/react-multi-step-form
```

For an application without React:

```npm
npm i @jfdevelops/multi-step-form-core
```

```pnpm
pnpm add @jfdevelops/multi-step-form-core
```

```yarn
yarn add @jfdevelops/multi-step-form-core
```

```bun
bun add @jfdevelops/multi-step-form-core
```

For TanStack Form integration, install the React runtime and adapter:

```npm
npm i @jfdevelops/react-multi-step-form @jfdevelops/react-multi-step-form-tanstack
```

```pnpm
pnpm add @jfdevelops/react-multi-step-form @jfdevelops/react-multi-step-form-tanstack
```

```yarn
yarn add @jfdevelops/react-multi-step-form @jfdevelops/react-multi-step-form-tanstack
```

```bun
bun add @jfdevelops/react-multi-step-form @jfdevelops/react-multi-step-form-tanstack
```

The adapter exposes native TanStack Form APIs. Configure it through
`formLibrary: tanstackForm()` and explicitly choose validation timing in
`formOptions`; see the [integration guide](guides/tanstack-form.md).

## Install a form editor

The builder has its own [documentation section](builder/overview.md), including
[installation](builder/installation.md), a [React quick start](builder/quick-start.md),
and guides for authoring, previewing, exporting, and saving definitions.

## Next steps

- [Create a React form](quick-start.md)
- [Build a form editor](builder/quick-start.md)
- [Create and export definitions](builder/definitions.md)
