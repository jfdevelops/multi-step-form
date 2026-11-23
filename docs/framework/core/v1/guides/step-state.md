---
title: Step state
description: Store interface state and derive summaries from fields without duplicating answer logic.
order: 60
---

Step state holds data beside a step's fields. Use it for derived summaries and
mutable interface values such as an expanded panel or a dependent selection.

In this guide you will:

- Declare literal and derived state.
- Recompute a value from a selected field.
- Update and reset mutable state.

## Declare state beside fields

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Tickets',
      fields: {
        quantity: { defaultValue: 1 },
        price: { defaultValue: 25 },
        date: { defaultValue: '' },
      },
      state: {
        isDetailsOpen: { value: false },
        total: { value: (fields) => fields.quantity * fields.price },
        dateLabel: {
          select: 'date',
          value: (date) => date || 'Choose a date',
        },
        selectedTime: { select: 'date', value: '' },
      },
    },
  },
}).configure();

const form = createForm();
const total = form.stepSchema.value.step1.state.total.value;
```

Without `select`, a function receives all raw field values. With `select`, it
receives that field's raw value. Resolved state preserves the entry object, so
read `.state.total.value`, not `.state.total` as a number.

## Choose derived or mutable state

| Entry | Behavior after field updates |
| --- | --- |
| Function `value` | Recomputes from fields |
| Literal `value` without `select` | Retains its current mutable value |
| Literal `value` with `select` | Resets to its configured value when that field changes |

`selectedTime` above clears when `date` changes. `isDetailsOpen` remains unchanged
by unrelated answer updates. Derived state is recomputed after restoring saved
data; resetting the step restores literals and recomputes derived entries.

## Update mutable state

```ts
form.stepSchema.value.step1.update({
  fields: ['state.isDetailsOpen.value'],
  updater: true,
});
```

Use the normal update path so subscriptions and persistence see the change.
State participates in its step's storage lifecycle and is independent per
instance. Keep a value in component state instead when it should disappear on
unmount and should not be part of a persisted draft.

A step without a `state` declaration has no resolved `state` property. Prefer a
derived entry to a second field when a total can be calculated from answers.

## Next steps

- [Update and reset values](updates-and-helpers.md)
- [Load async data](async-data.md)
- [Subscribe from React](../../../react/v1/guides/subscriptions.md)
