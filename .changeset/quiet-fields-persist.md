---
'@jfdevelops/multi-step-form-core': patch
---

Fix storage sync discarding function-valued field metadata (e.g. a date field's `transform`) by restoring it from the in-memory fields instead of the JSON-parsed storage value.
