---
'@jfdevelops/multi-step-form-core': minor
---

feat(core): add step-level overrides with full type inference

- Added `overrides` callback support on step definitions with strongly-typed `data` parameter (resolved step data with widened field defaults)
- Added `StepOverrides`, `StepOverridePatch`, `StepOverrideResult`, and `StepResolvedData` public types
- Added `StepDefaultValues` mapped type with index-signature filtering to produce accurate per-field primitive types
- Supports both sync and async override functions
