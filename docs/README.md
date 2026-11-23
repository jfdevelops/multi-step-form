# Documentation

The public collection has three learning paths: React runtime, framework-independent
runtime, and the form builder. The builder has a dedicated directory and generated
navigation group rather than appearing among general runtime guides.

## React runtime

Start with the [overview](framework/react/v1/overview.md),
[installation](framework/react/v1/installation.md), and
[complete registration walkthrough](framework/react/v1/quick-start.md).

| Task | Guide |
| --- | --- |
| Bind and reuse input components | [Fields and components](framework/react/v1/guides/fields-and-components.md) |
| Read reactive answers and share layout | [Subscriptions](framework/react/v1/guides/subscriptions.md) |
| Navigate, show progress, and review | [Navigation and review](framework/react/v1/guides/navigation-and-review.md) |
| Validate and submit | [Validation and submission](framework/react/v1/guides/validation-and-submission.md) |
| Use native TanStack Form | [TanStack integration](framework/react/v1/guides/tanstack-form.md) |
| Coordinate related answers | [Dependent fields](framework/react/v1/guides/dependent-fields.md) |
| Render async data | [Async fields](framework/react/v1/guides/async-fields.md) |
| Connect labels, errors, and keyboard behavior | [Accessibility](framework/react/v1/guides/accessibility.md) |
| Diagnose an integration | [Troubleshooting](framework/react/v1/troubleshooting.md) |

## Core runtime

Start with the [core overview](framework/core/v1/overview.md) and
[TypeScript guide](framework/core/v1/typescript.md).

The [core utilities index](framework/core/v1/utilities/overview.md) covers value
extraction, step parsing, helper functions, action factories, casing, storage,
diagnostics, composition, and type utilities. The [React utilities index](framework/react/v1/utilities/overview.md)
covers context hooks, component render utilities, `createHook`, and deferred execution.

- [Instances and answer storage](framework/core/v1/guides/instances-and-storage.md)
- [Updates, resets, and helpers](framework/core/v1/guides/updates-and-helpers.md)
- [Derived and mutable step state](framework/core/v1/guides/step-state.md)
- [Async definitions and defaults](framework/core/v1/guides/async-data.md)
- [Reusable conditions](framework/core/v1/guides/conditions.md)

## Builder

All builder pages live in `framework/react/v1/builder/`, including core-only
authoring and compilation. Start with the [builder overview](framework/react/v1/builder/overview.md),
[installation](framework/react/v1/builder/installation.md), and
[editor quick start](framework/react/v1/builder/quick-start.md).

For custom tooling, see [builder utilities](framework/react/v1/builder/utilities/overview.md):
schema traversal, value conversion, editor models and actions, validator
resolution, adapter development, and expression/import emission.

| Task | Guide |
| --- | --- |
| Understand JSON definitions and runtime compilation | [Definitions](framework/react/v1/builder/definitions.md) |
| Add and reorder content | [Steps and fields](framework/react/v1/builder/steps-and-fields.md) |
| Render property panels | [Inspector](framework/react/v1/builder/inspector.md) |
| Model nested values and checks | [Schemas](framework/react/v1/builder/schemas.md) |
| Extend the palette and metadata | [Custom fields and registries](framework/react/v1/builder/custom-fields.md) |
| Select validation and adapters | [Validation](framework/react/v1/builder/validation.md) |
| Add undo, clipboard, and keyboard actions | [Selection and history](framework/react/v1/builder/selection-and-history.md) |
| Constrain dragging and insertion | [Drag and drop](framework/react/v1/builder/drag-and-drop.md) |
| Test the designed form | [Preview](framework/react/v1/builder/preview.md) |
| Export typed application modules | [Code generation](framework/react/v1/builder/code-generation.md) |
| Configure runtime behavior | [Form settings](framework/react/v1/builder/settings.md) |
| Save and restore editor drafts | [Persistence](framework/react/v1/builder/persistence.md) |
| Diagnose a definition or editor | [Troubleshooting](framework/react/v1/builder/troubleshooting.md) |

## Contributing

Public pages live under `docs/framework/<framework>/v<major>/`. Read the
[content contract](maintainers/content-contract.md) before changing them.

```sh
pnpm docs:generate
pnpm docs:check
```

The generator derives `docs/docs.json` and per-directory `meta.json` navigation
from frontmatter. Generated files stay ignored. Generation currently skips the
API reference; keep guides task-oriented rather than duplicating API signatures.
