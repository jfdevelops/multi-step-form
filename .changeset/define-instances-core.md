---
"@jfdevelops/multi-step-form-core": major
---

Add `defineMultiStepForm`, an instances-first factory: `defineMultiStepForm({ steps, instances? }).configure({ storage?, update?, nameTransformCasing? })` creates independent named instances that share step/field definitions and helper functions.

- Storage is optional and per-instance via `configure({ storage: { key, configure: { instances } } })`, with an optional `update.updateStorage` gate (`boolean` or `(instance) => boolean`).
- Field metadata: `placeholder`, `isRequired` (default `false`), and `errorMessage`. Required fields without an explicit `label` get a trailing `*` on the resolved label.
- Step `isComplete(data)` predicate, exposed as `step.isComplete()` / `stepSchema.isStepComplete(...)`.
- New `InvalidInstanceError` and `NoActiveInstanceError`.

BREAKING CHANGE: step-level `overrides` is removed from the step config — attach overrides per instance with `instance.withOverrides(...)`. For `defineMultiStepForm`, `nameTransformCasing` moves to `.configure()`.
