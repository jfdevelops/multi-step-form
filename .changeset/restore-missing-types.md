---
'@jfdevelops/multi-step-form-core': patch
'@jfdevelops/react-multi-step-form': patch
---

fix: restore missing types removed during type system rewrite (#182)

- Added `StrippedResolvedStep<T, withFunctions>` to `@jfdevelops/multi-step-form-core`
- Added `CreateStepSpecificComponentCallback` to `@jfdevelops/react-multi-step-form`
- Added `MultiStepFormSchema.resolvedStep<T>` utility type to the `MultiStepFormSchema` namespace
- Exported `StepSpecificComponent` and related types from the react package public API via `export * from './steps'`
