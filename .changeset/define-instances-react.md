---
"@jfdevelops/react-multi-step-form": major
---

Add the React `defineMultiStepForm` factory (mirroring core instances/storage) and migrate to per-instance `.withOverrides(...)` instead of step-level `overrides`.

BREAKING CHANGE: step-level `overrides` on the step config is removed — use `createForm({ instance }).withOverrides(...)` (chainable with `.withForm()` / `.withContext()`).
