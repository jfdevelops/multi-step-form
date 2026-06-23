---
'@jfdevelops/react-multi-step-form': minor
---

refactor: remove `useFormInstance` from `createComponent` and type `Form` by default

- Removes the `useFormInstance` option from the second `createComponent` overload — the `Form` component from an external form library can now be composed manually in the callback instead
- `Form` (the default `<form>` wrapper) is now always present in the `createComponent` callback type when no custom `withForm()` config is supplied, matching existing runtime behaviour
- Simplifies `StepSpecificComponent.options` from 5 type params to 3
- Removes `formInstanceOptions`, `DEFAULT_FORM_INSTANCE_ALIAS`, and `defaultFormInstanceAlias` from the public API
