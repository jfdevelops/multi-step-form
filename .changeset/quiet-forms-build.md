---
'@jfdevelops/react-multi-step-form': patch
---

fix: preserve custom `Form` inference in built package declarations

Ensures the generated declaration files keep the `withForm()` schema type enriched with the custom form config, so consumers importing the published package receive the same `Form` props inference as source-level tests.
