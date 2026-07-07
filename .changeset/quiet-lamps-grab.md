---
'@jfdevelops/multi-step-form-core': minor
'@jfdevelops/react-multi-step-form': minor
---

feat(core,react): support async step definitions without async schema creation

Step definitions can now be provided as async functions that resolve to the existing step object shape while `createMultiStepFormSchema` stays synchronous. Async steps resolve lazily through the existing step resolution flow, and the React package keeps `createComponent`, `useStep`, and suspense behavior intact for sync, async, and mixed step definitions.
