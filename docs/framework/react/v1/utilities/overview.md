---
title: React utilities
description: Choose reactive data hooks, component utilities, and post-commit action scheduling.
order: 0
---

The React integration provides utilities on three surfaces: package exports,
schema context hooks, and the input supplied to a created component or hook.
Choose the surface that matches how your code owns the instance.

## Find the right surface

| Surface | Available tools | Guide |
| --- | --- | --- |
| Package exports | `useMultiStepFormData`, `createMultiStepFormContext`, `useDeferredExecution` | [Context hooks](context-hooks.md), [scheduling](scheduling.md) |
| `form.context` | `useMultiStepFormData`, `useCurrentStepData`, `useProgress`, `useCanRestartForm`, `withProgressText`, `withNoStepDataFound` | [Context hooks](context-hooks.md) |
| Step render input | `Field`, `Selector`, `useSelector`, `useStep`, `Suspend`, `defaultValues`, `validation`, updates and resets | [Component utilities](component-utilities.md) |
| Step factories | `createComponent`, `createComponent.forField`, `createHook` | [Field components](../guides/fields-and-components.md), [scheduling](scheduling.md) |
| Shared form render context | `getCurrentStepData`, `getProgress`, `isStepComplete`, `steps`, `id` | [Shared form helpers](shared-form.md) |
| Root action re-exports | `createUpdate`, `update`, `createReset`, `reset`, `createConditions`, `sharedFieldFunction` | [Core action utilities](../../../core/v1/utilities/action-factories.md) |

`MultiStepFormReactDefinition` represents the React definition/factory API;
`MultiStepFormSchema` and `MultiStepFormStepSchema` expose React-bound schema
behavior. Use `defineMultiStepForm` to retain concrete inference rather than
constructing their generic types manually.

## Keep reactive reads and actions separate

Subscriptions calculate what the interface displays. Event handlers act on the
latest answers. `createHook` schedules a selected function after commit when a
hook must reconcile form state; `useDeferredExecution` creates an event callback
that reads its latest committed function and arguments.

Neither utility makes it safe to perform arbitrary writes during React render.
Use an event action for user input and a guarded scheduled action for automatic
reconciliation.

## Next steps

- [Read data with context hooks](context-hooks.md)
- [Use step component utilities](component-utilities.md)
- [Schedule actions after commit](scheduling.md)
