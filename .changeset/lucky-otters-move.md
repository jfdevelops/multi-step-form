---
"@jfdevelops/react-multi-step-form": patch
---

Fixes `ctx.{currentStep}` being `undefined` when calling step specific `createComponent` function with a custom `useFormInstance` and no `ctxData`
