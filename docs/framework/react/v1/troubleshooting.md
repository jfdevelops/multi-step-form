---
title: Troubleshooting
description: Diagnose stale renders, unexpected instance behavior, missing defaults, and incomplete navigation gates.
order: 30
---

Most integration problems come from reading a different instance than the one
being updated, bypassing subscriptions, or expecting the runtime to own an
application decision such as routing.

## Find the symptom

| Symptom | Check |
| --- | --- |
| Answer changes but summary stays stale | Use a selector or bound hook for rendered data |
| Field type is unexpectedly narrow | Type empty arrays and union defaults intentionally |
| Update fails shape validation | Check the selected path and the returned value's shape |
| Two screens share answers | Check factory lifetime and instance names |
| Separate instances overwrite saved drafts | Give them separate storage keys |
| Shared helper updates the wrong form | Check the active instance or use a bound operation |
| `NoActiveInstanceError` | Create or select an instance before calling a factory helper |
| Continue allows an empty step | Define `isComplete` and enforce it in navigation |
| Async step has no fields | Resolve it or render through the step's `Suspend` utility |
| Native form is missing | Import the React definition and configure `formLibrary` |

## Trace one answer

1. Identify the final schema returned by your configuration chain.
2. Check that the field component is bound to that schema.
3. Read its current `fields.<name>.defaultValue` in the event handler.
4. Check that visible consumers subscribe to the same schema.
5. Inspect the storage key separately if the issue appears only after reload.

Do not mutate `stepSchema.value` directly. Use `onInputChange`, `update`, or a
reusable operation so change notifications and persistence run.

## Preserve the configured schema

`withOverrides`, `withForm`, and `withContext` return new schemas. Use the returned
object and finish the chain before creating components. Do not repeatedly build
the chain while rendering or keep writing through the superseded object.

Context hooks created by `withContext()` are bound to the schema. Factory shared
helpers instead use the active instance. These are different selection mechanisms;
mounting a subtree does not automatically select the active factory instance.

## Diagnose async failures

Read `getStepStatus` and `getStepError` before assuming loaded fields exist.
Catch `resolveStep` failures and retry by resolving again. Definitions cache per
instance; reset restores their defaults and does not refetch live server data.

## Next steps

- [Instances and lifetime](../../core/v1/guides/instances-and-storage.md)
- [Subscriptions](guides/subscriptions.md)
- [Async definitions and defaults](../../core/v1/guides/async-data.md)
- [Typed updates](../../core/v1/guides/updates-and-helpers.md)
