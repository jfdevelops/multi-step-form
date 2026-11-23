---
title: Action factories
description: Build typed setters, object patches, conditional resets, and deferred actions with the public root APIs.
order: 40
---

`createUpdate` and `createReset` expose the same reusable scopes attached to a
live step. Use the root APIs when a shared module receives a step as a dependency.

In this guide you will:

- Scope operations to fields.
- Transform validated input into an update.
- Choose replacement or patch behavior.
- Guard and defer execution explicitly.

## Obtain a scope from a live step

```ts
import { createUpdate, createReset, defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Preferences',
      fields: { preferences: { defaultValue: { reminders: false, newsletter: false } } },
    },
  },
}).configure()();

const step = form.stepSchema.value.step1;
const preferences = createUpdate.forStep(step).forFields(['fields.preferences.defaultValue']);
const patchPreferences = preferences.patch();
patchPreferences({ reminders: true });

const clearPreferences = createReset.forStep(step).forFields(['fields.preferences.defaultValue']);
clearPreferences();
```

`update` is an alias of the root `createUpdate`; `reset` aliases `createReset`.
The root reset callable can also execute immediately with `{ step, fields }`.
Root `update.patch({ step, fields })` creates a patch operation directly.

## Transform input before writing

```ts
const setPreferences = preferences.withInput((enabled: boolean) => enabled).bind({
  updater: ({ current, input }) => ({ ...current, reminders: input }),
});

setPreferences(true);
```

`withInput` supplies validation or transformation. `bind` computes a full next
selected value from `current`, `input`, and context. It also receives the input
as a second updater argument. `patch` instead shallow-merges a partial object;
use a patch mapper when the caller's input differs from the patch shape.

The operation's `ctx` contains helper context, so selected steps are under
`ctx.ctx.step1`. This differs from a `createHelperFn` callback, whose `ctx`
directly contains `step1`. Prefer `current` for rules about the selected value.

## Add conditional and deferred behavior

```ts
const onlyWhenDisabled = setPreferences.withConditions([
  ({ current }) => !current.reminders,
]);
const applyLater = onlyWhenDisabled.deferExecution(true);
const result = applyLater();
```

`withConditions` creates a new callable, `forConditions` supplies invocation-only
rules, and `createCondition` produces a reusable predicate. Failed conditions
return a skipped `UpdateResult`; they do not partially apply the action.

Ordinary calls execute now. `deferExecution` captures an invocation and returns a
function. Values supplied as arguments are captured; the current form context
and conditions are read when that function executes.

## Choose resets for original values

Reset scopes restore original configured values rather than applying another
patch. They support field scoping and conditions, but do not need caller input
to calculate the restored value. Use a reset for “restore defaults” and an update
for “replace with newly fetched account data.”

## Next steps

- [Condition expressions](../guides/conditions.md)
- [Shared helpers](helper-functions.md)
- [Schedule actions in React](../../../react/v1/utilities/scheduling.md)
