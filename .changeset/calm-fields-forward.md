---
'@jfdevelops/react-multi-step-form': patch
---

Correct `createComponent.forField` return props so generated components forward Field options other than the internally owned `name` and `children`, while continuing to infer and accept custom render props.
