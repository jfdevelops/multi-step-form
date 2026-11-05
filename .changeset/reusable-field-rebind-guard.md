---
'@jfdevelops/react-multi-step-form': patch
---

fix: stop exposing `bindToField`/`bindToInstance` at runtime once that slot is already bound

Every wrapper produced by `withReusableField` exposed both `bindToField` and `bindToInstance` regardless of whether a slot was already fixed — an instance-bound, field-bound, or fully bound component still had both methods at runtime even though its type no longer does. Calling one of those "rebound" a component without error, but the inner wrapper injects its originally-bound value last, so the component silently kept reading and writing the original instance/field instead. A caller relying only on the types never hit this, but plain JS, `as any`, or a type-erasing HOC could.

`bindToField`/`bindToInstance` are now only attached for slots that aren't already bound, so calling either on an already-bound component throws instead of silently doing nothing.
