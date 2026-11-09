# react-form-builder

A small but complete form builder made with
[`@jfdevelops/react-multi-step-form-builder`](../../packages/builder-react/README.md). It starts
with a sample workshop proposal with organizer details, session format, nested equipment requests, and scheduling.

The editor has three modes:

- **Build:** insert fields from the left, design a step on the centered form surface, and edit
  the selected field on the right. Canvas controls illustrate the form; switch to Preview to
  fill them in. Drag handles and field actions appear on hover, selection, or keyboard focus.
- **Preview:** a working multi-step form with desktop and mobile widths. Entries and navigation
  survive mode switches. Errors appear after blur or an attempted Next/Submit; **Show validation
  errors** reveals them immediately when testing. Reset clears entries and interaction history.
- **Code:** generated modules, Standard Schema, and JSON as subtabs. Each generated step module
  contains its definition, value types, and validator. Monaco resolves imports with the real
  packages' types; hover to inspect inference.

Common field properties (Label, Placeholder, Help text, Required) stay visible. **Validation**
contains format and value checks; **Data** contains the key, default value, value type, and
nullable setting; **Advanced** contains label casing. New field keys follow labels until the
key is explicitly edited. Sample fields retain their authored keys.

**Form settings** opens a shadcn Sheet from the toolbar. Its General, Storage, and Instances
tabs organize validation, labels, progress persistence, and named instances. Use **Add instance** to create named instances with independent runtime state.
Undo/Redo remain in the header; Sample and Clear live in the More actions menu.

The sample is a module-level `sampleDefinition` in `src/registry.ts`, constructed with the
fluent `createDefinitionBuilder().settings().step(...).build()` API. Step callbacks chain
`.field({ type, key, ... })` calls without managing step IDs.

All of the UI is in [`src`](src). Tailwind CSS v4 runs through the Vite plugin, with theme tokens
and editor layout utilities in `src/styles.css`. Shadcn components are owned locally in
`src/components/ui`; `components.json` configures the registry and import aliases.

The Insert and Properties panels use shadcn Sidebar components on the left and right. The
headless builder's `render` API composes its palette, search, step tabs, and drag handles with
shadcn controls while preserving the builder's behavior. Tabs, accordions, settings sheets,
menus, fields, and preview controls use the same component system.

```bash
pnpm build:builder   # from the repo root, once
pnpm --filter react-form-builder dev
pnpm --filter react-form-builder test
```

## Types in the code editor

[`editor-types.ts`](editor-types.ts) is a small Vite plugin that serves the type declarations of the
packages generated code can import (and their dependencies) as lazily loaded modules. The editor
loads a library's types when the generated code first imports it. Rebuilding a package invalidates
the served declarations and reloads the page so Monaco picks up the updated API types.
[`test/generated-code.test.ts`](test/generated-code.test.ts) typechecks the generated module with
every library against exactly those types.

`test/monaco-worker.test.ts` also checks the hover in Monaco's shipped TypeScript worker with
the same virtual file URLs and declaration bundles used in the browser.
