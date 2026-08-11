---
'@jfdevelops/multi-step-form-core': patch
---

Make `hasKey()` safely report `false` when storage is unavailable, matching the other storage operations during SSR.
