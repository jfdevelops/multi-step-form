# `@jfdevelops/react-multi-step-form` docs

- [Migrating from alpha](./migration.mdx) — moving step-level `overrides` to `.withOverrides(...)`
  within the existing builder chain.
- [Instances, storage & the builder order](./instances-and-storage.mdx) — `defineMultiStepForm`,
  the `withOverrides` → `withForm` → `withContext` builder order, and wiring the active instance
  in a React tree.

See also [`packages/core/docs`](../../core/docs) for the framework-agnostic instances/storage API
these build on.
