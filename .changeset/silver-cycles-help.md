---
'@jfdevelops/react-multi-step-form': patch
---

fix: restore `Form` inference in step component callback types

Restores the custom `Form` component typing for `step.createComponent(...)` callbacks when using `withForm({ render })`, and also restores the exported `CreateStepSpecificComponentCallback` helper type so it carries the same inferred `Form` props.
