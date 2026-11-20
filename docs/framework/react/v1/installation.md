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

```bash
pnpm add @jfdevelops/react-multi-step-form
```

For an application without React:

```bash
pnpm add @jfdevelops/multi-step-form-core
```

For TanStack Form integration, install the React runtime and adapter:

```bash
pnpm add @jfdevelops/react-multi-step-form @jfdevelops/react-multi-step-form-tanstack
```

The adapter exposes native TanStack Form APIs. Configure it through
`formLibrary: tanstackForm()` and explicitly choose validation timing in
`formOptions`; see the [integration guide](../../../../packages/react-tanstack-form/docs/integration.mdx).

## Install a form editor

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/react-multi-step-form-builder
```

The React builder supports React 18 and 19. Its components provide behavior and
accessibility wiring; supply your application's layout and styles.

The built-in validator requires no separate validator package. To use a schema
library, install its builder adapter and peer dependency as described in
[Choose a builder validator](../../core/v1/guides/validators.md).

## Next steps

- [Create a React form](quick-start.md)
- [Build a form editor](guides/form-builder.md)
- [Create and export definitions](../../core/v1/guides/definitions.md)
