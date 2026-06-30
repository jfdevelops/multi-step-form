---
'@jfdevelops/react-multi-step-form': patch
'@jfdevelops/multi-step-form-core': patch
---

fix: restore override field inference in react schema factory

Aligns the React schema factory with the core factory so step `overrides` callbacks receive properly inferred `fields` data. Also adds regression coverage to ensure partial override patches still preserve untouched step fields through `withForm()` and `withContext()`.
