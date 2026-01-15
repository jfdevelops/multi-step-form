---
"@jfdevelops/multi-step-form-core": patch
---

# Type System Revamp

- Reduced the amount of generics down to 2 for external types
- Removed `First` and `Last` types as these weren't being used and was slowing down the TS server due to heavy recursion

# Removed unused functions

- `MultiStepFormStepSchema.first()`
- `MultiStepFormStepSchema.last()`
