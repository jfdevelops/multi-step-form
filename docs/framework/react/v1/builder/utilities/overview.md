---
title: Builder utilities
description: Find the lower-level helpers for schema tooling, editor models, validation, and source emission.
order: 0
---

Builder utilities let you implement custom editor surfaces and validator adapters
without reproducing the definition, schema, and code-generation rules.

## Choose a utility workflow

| Need | Guide |
| --- | --- |
| Create IDs and keys, inspect registry defaults, or import existing steps | [Definition utilities](definition-utilities.md) |
| Traverse schemas, fit defaults, serialize dates, or display types | [Schema and value utilities](schema-values.md) |
| Build a custom canvas, inspector, or property editor | [Editor models and actions](editor-models.md) |
| Resolve validation and compile one step | [Validator utilities](validator-utilities.md) |
| Add a validator library | [Adapter development](adapter-development.md) |
| Keep emitted source aligned with runtime values | [Expressions and imports](expressions-and-imports.md) |
| Use schema builders supplied by adapter packages | [Adapter package helpers](adapter-packages.md) |

These helpers come from `@jfdevelops/multi-step-form-builder-core`, except the
explicitly identified React hooks and components. They do not require installing
every schema-library adapter.

## Preserve the authoring lifecycle

Pure schema/model helpers return data. Builder commands record edits and update
history, issues, and subscriptions. Choose the latter when modifying a running
editor. Returning a modified schema tree by itself does not update that editor.

## Next steps

- [Work with schema values](schema-values.md)
- [Build custom editor models](editor-models.md)
- [Understand the builder](../overview.md)
