---
title: Core utilities
description: Find the runtime helpers for reading values, selecting steps, building actions, and diagnosing integrations.
order: 0
---

The core package exposes utilities beyond defining a form. Use this section when
building shared controls, custom workflows, adapters, or tooling around an instance.

## Choose a utility by task

| Task | Read |
| --- | --- |
| Extract raw answers or resolve nested field paths | [Values and paths](values-and-paths.md) |
| Parse a route step or transform step keys | [Step selection](step-selection.md) |
| Share validated domain actions and selected context | [Helper functions](helper-functions.md) |
| Build reusable setters, patches, and resets | [Action factories](action-factories.md) |
| Generate labels and transform casing | [Labels and casing](labels-and-casing.md) |
| Read, write, and remove stored drafts | [Storage and lifecycle](storage-and-lifecycle.md) |
| Log operations and handle typed errors | [Diagnostics](diagnostics.md) |
| Compose callable APIs or construct resolved data | [Low-level composition](composition.md) |
| Extract and transform public types | [Type utilities](type-utilities.md) |
| Resolve dates, validation, and overrides | [Dates and resolution](dates-and-resolution.md) |

All imports in this section come from `@jfdevelops/multi-step-form-core`.
The React package re-exports selected action utilities, but not every core helper.
Import core helpers from core rather than assuming all packages share an entry point.

## Choose a level of abstraction

Start with an instance's bound methods when targeting a running form. Use
standalone helpers for reusable algorithms, and low-level constructors only when
you need to own the surrounding validation, notification, and persistence behavior.

Reading an answer does not subscribe a view. Reading a storage object does not
update a mounted instance. Likewise, creating a context object does not create a
second form. Keep the owner of state explicit when combining these utilities.

## Next steps

- [Read values and paths](values-and-paths.md)
- [Select steps safely](step-selection.md)
- [React utility hooks](../../../react/v1/utilities/overview.md)
