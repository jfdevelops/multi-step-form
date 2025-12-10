---
'@jfdevelops/react-multi-step-form': patch
'@jfdevelops/multi-step-form-core': patch
---

Changes storage module so that the actions (get, add, remove) are only ran if `window` is defined OR a specific store is provided and `window` is defined
