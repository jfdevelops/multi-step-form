---
'@jfdevelops/react-multi-step-form': minor
---

feat(react): type `useStep` errors and expose override failures per step

`useStep()` now exposes override resolution errors on the current step and defaults the `error` property to `Error | undefined`. Callers can also override the error type at the hook call site with `useStep<MyError>()`.
