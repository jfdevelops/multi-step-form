---
'@jfdevelops/multi-step-form-core': patch
---

Build every core error with `@jfdevelops/create-error`, validating each error's context with ArkType. Define custom errors with `createMultiStepFormError({ code, scope }).defineContext(schema).implement(({ context, scope }) => message)`; `renderMessage` keeps its `(scope, context)` renderer.
