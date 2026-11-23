---
title: Builder installation
description: Install the editor core, optional React interface, and validator adapters for your authoring workflow.
order: 10
---

Install the React builder to compose a visual editor. Install only builder core
when authoring definitions programmatically or implementing another interface.

## Install the visual editor

```npm
npm i @jfdevelops/multi-step-form-builder-core @jfdevelops/react-multi-step-form-builder
```

```pnpm
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/react-multi-step-form-builder
```

```yarn
yarn add @jfdevelops/multi-step-form-builder-core @jfdevelops/react-multi-step-form-builder
```

```bun
bun add @jfdevelops/multi-step-form-builder-core @jfdevelops/react-multi-step-form-builder
```

The React builder supports React 18 and 19. Its components supply behavior and
accessibility props. Supply CSS and control renderers appropriate for your
application; installing the package does not install a finished editor theme.

## Install core without React

```npm
npm i @jfdevelops/multi-step-form-builder-core
```

```pnpm
pnpm add @jfdevelops/multi-step-form-builder-core
```

```yarn
yarn add @jfdevelops/multi-step-form-builder-core
```

```bun
bun add @jfdevelops/multi-step-form-builder-core
```

Core includes a built-in validator adapter. Select `builtin` in form settings
when you want schema-based completion without another validator dependency.
No validation is selected merely by having the adapter available.

## Add a schema library when needed

The [validation guide](validation.md) lists available adapters and their peers.
Keep the configured registry available to editing, preview, compilation, and
export. A saved definition names its validator but does not bundle that adapter.

Generated application code has its own dependencies. Install the packages
reported by code generation in the application consuming that code, even if
the editor already has them installed.

## Next steps

- [Build a React editor](quick-start.md)
- [Author definitions with core](definitions.md)
- [Choose validation](validation.md)
