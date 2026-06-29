---
'@jfdevelops/multi-step-form-core': patch
'@jfdevelops/react-multi-step-form': patch
---

fix: tighten override field inference and preserve omitted field defaults

Resolved override data now exposes exact step field keys without a generic string index, which restores field inference in both core and React step consumers. This also adds regression coverage to ensure partial override patches do not remove untouched step fields at runtime.
