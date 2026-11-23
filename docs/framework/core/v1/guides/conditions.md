---
title: Reusable conditions
description: Compose synchronous rules and apply them to updates and resets at execution time.
order: 80
---

Conditions express rules that must pass before an operation runs. Reuse them
when several actions share the same readiness or eligibility checks.

In this guide you will:

- Compose AND and OR expressions.
- Create named predicates.
- Guard a field operation using current values.
- Distinguish a condition result from validation feedback.

## Compose a rule independently of a form

```ts
import { createConditions } from '@jfdevelops/multi-step-form-core';

type Eligibility = { hasEmail: boolean; confirmed: boolean; isInvited: boolean };
const conditions = createConditions<Eligibility>();
const hasContact = conditions.createCondition({
  name: 'has contact details',
  condition: ({ hasEmail }) => hasEmail,
});
const canRegister = conditions.compile({
  and: [hasContact, { or: [({ confirmed }) => confirmed, ({ isInvited }) => isInvited] }],
});

const allowed = canRegister({ hasEmail: true, confirmed: false, isInvited: true });
```

An expression is a non-empty array or an object containing `and` or `or`.
An array means AND. Groups can contain booleans, predicates, and nested groups.
Evaluation short-circuits; later predicates may not run when an earlier result
already determines the group.

Use pure synchronous predicates. Negate a boolean inside a predicate when needed;
there is no `not` expression operator. An async eligibility check should resolve
into application state before a synchronous condition reads its result.

## Guard an operation with the latest value

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Preferences',
      fields: { reminders: { defaultValue: false } },
    },
  },
}).configure()();

const setReminders = form.stepSchema.value.step1.createUpdate.patch({
  fields: ['fields.reminders.defaultValue'],
});
const isDisabled = setReminders.createCondition(({ current }) => !current);
const enableOnce = setReminders.withConditions([isDisabled]);

const first = enableOnce(true);
const second = enableOnce(true);
```

The first call executes. The second returns a condition-failed result because
`current` is read again and is already true. You do not need to rebuild the
predicate after every update.

`withConditions` returns an independent callable carrying inherited conditions.
`forConditions(expression, ...arguments)` adds rules for one invocation. Reset
scopes offer the same pattern. Deferred invocations check their conditions when
executed, not when captured.

## Explain a blocked operation

An operation result tells you whether it executed; it is not a field error map
or a navigation action. Translate a blocked result into appropriate application
feedback. Keep server authorization and payload validation at the server boundary
even if the client uses the same eligibility rule to improve its interface.

## Next steps

- [Updates and resets](updates-and-helpers.md)
- [Step completion and submission](../../../react/v1/guides/validation-and-submission.md)
- [Instance targeting](instances-and-storage.md)
