---
title: Updates, resets, and helpers
description: Change nested answers, reuse conditional operations, and reset selected values through the runtime.
order: 50
---

Update methods change answers while keeping subscriptions, derived state, and
storage synchronized. Reusable operations put domain behavior in one place so
buttons, fields, and other application code use the same rules.

In this guide you will:

- Update a selected value.
- Patch an object with a reusable operation.
- Guard updates with conditions.
- Reset selected values and choose helper scope.

## Update the value you intend to change

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: {
        email: { defaultValue: '' },
        preferences: { defaultValue: { reminders: false, newsletter: false } },
      },
    },
  },
}).configure();

const form = createForm();
form.stepSchema.value.step1.update({
  fields: ['fields.email.defaultValue'],
  updater: 'reader@example.com',
});
```

Paths start at the step, so `fields.email.defaultValue` selects the answer while
`fields.email` selects its whole metadata object. Update the narrowest meaningful
value. A React `Field` already provides `onInputChange` for the common answer edit.

## Reuse an object patch

```ts
const patchPreferences = form.stepSchema.value.step1.createUpdate.patch({
  fields: ['fields.preferences.defaultValue'],
});

patchPreferences({ reminders: true });
patchPreferences({ newsletter: true });
```

The patch merges into the latest selected object. The second call retains the
first call's reminder setting. Patches are shallow: when patching a nested object,
select that object explicitly instead of assuming a recursive merge.

## Guard an operation at execution time

```ts
const enableReminders = patchPreferences.withConditions([
  ({ ctx }) => ctx.ctx.step1.fields.email.defaultValue.includes('@'),
]);

const result = enableReminders({ reminders: true });

if (!result.executed) {
  console.log('Add an email address before enabling reminders.');
}
```

Conditions read the latest context immediately before execution. Failed
conditions return `{ executed: false, reason: 'condition-failed' }`; they do not
apply the update. `withConditions` creates a new callable and retains inherited
conditions. `forConditions` adds a condition for one invocation. An array combines
conditions with AND; recursive expressions can combine `and` and `or`. Negate a
predicate's boolean result inside the predicate when needed.

Use `createCondition` on a scope to name and reuse a predicate. Use `withInput`
with a validator when callers need a validated input contract, then `bind` or
`patch` to turn that input into an update.

## Defer the action explicitly

```ts
const applyLater = patchPreferences.deferExecution({ reminders: true });

// Run this in the eventual event handler.
applyLater();
```

An ordinary update call executes immediately. `deferExecution` captures an
invocation as a function; it is useful for event handlers or an application queue.
Conditions still evaluate when that function executes.

## Reset selected values

```ts
const resetPreferences = form.stepSchema.value.step1.createReset.forFields([
  'fields.preferences.defaultValue',
]);

resetPreferences();
```

This resets preferences without clearing the email. `step.reset()` resets the
whole step. Reset scopes also support `withConditions`, `forConditions`, and
`createCondition`, allowing the same execution-time rules as updates.

## Choose bound or shared helpers

`form.stepSchema.value.step1.createHelperFn(options, callback)` creates a helper
bound to that instance. The callback receives validated `data`, selected `ctx`,
and update/reset utilities. Use it for a domain action that reads and coordinates
more than one field operation.

Factory-level `createForm.step1.createHelperFn(...)` helpers dispatch to the
active instance. Calling the factory selects an instance; you can also use
`setActiveInstance(name)` and inspect `getActiveInstanceName()`. Calling a shared
helper before creating an instance throws `NoActiveInstanceError`.

When two workflows are mounted concurrently, prefer bound operations when the
target must remain stable. The active instance is shared factory state, not a
React subtree selection.

## Next steps

- [Understand instance lifetime](instances-and-storage.md)
- [Derive step state](step-state.md)
- [Create reusable React fields](../../../react/v1/guides/fields-and-components.md)
