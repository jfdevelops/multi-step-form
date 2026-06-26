---
'@jfdevelops/multi-step-form-core': patch
'@jfdevelops/react-multi-step-form': patch
---

fix: omit disabled field labels and restore reactive field selector props

Disabled field labels are now omitted from the resolved field config and from React `Field` children props instead of being exposed as `false` or `undefined`. This also fixes React field selector children so `selected.value` updates with the latest form state.
