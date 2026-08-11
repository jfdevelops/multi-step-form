---
'@jfdevelops/react-multi-step-form': patch
---

Restore the complete schema surface, including the exact type-only step union and `stepSchema`, on the callable factory returned by `defineMultiStepForm().configure()` while keeping factory and instance state isolated.
