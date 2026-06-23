---
'@jfdevelops/react-multi-step-form': patch
---

feat: expose `defaultValues` in `createComponent` callback

`defaultValues` is now available directly in the `createComponent` callback, providing the same flat map of field default values that was previously only accessible via the removed `useFormInstance.render` input.
