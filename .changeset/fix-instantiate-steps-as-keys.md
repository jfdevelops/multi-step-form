---
"@jfdevelops/multi-step-form-core": patch
---

Keep concrete step keys in `_instantiateSteps` when step configs declare typed `isComplete` predicates, so `steps.as('string.keys')` no longer collapses to `never`.
