---
'@jfdevelops/multi-step-form-core': patch
'@jfdevelops/react-multi-step-form': patch
---

Prevent `withOverrides` from being chained a second time on the same instance, removing the race where a superseded instance's override resolver could still run.
