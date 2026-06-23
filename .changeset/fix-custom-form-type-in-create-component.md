---
'@jfdevelops/react-multi-step-form': patch
---

fix: restore custom `Form` type in `createComponent` callback when using `withForm({ render })`

When `withForm()` was called with only `render` (no `alias` or `enabledForSteps`), the `Form` parameter in the `createComponent` callback was incorrectly typed as the generic HTML form element instead of the user's custom form component. This has been fixed.
