---
title: Dependent fields and structured answers
description: Update related answers together and preserve structured value types in custom controls.
order: 70
---

Some answers change the meaning of others: choosing another event can invalidate
its selected time, or changing a ticket count can change a total. Model these
dependencies explicitly so the form cannot retain an impossible combination.

In this guide you will:

- Update dependent fields together.
- Derive a value instead of duplicating it.
- Bind structured answers to suitable controls.
- Handle remote dependencies without stale updates.

## Clear a dependent answer in one operation

```ts
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Schedule',
      fields: { date: { defaultValue: '' }, time: { defaultValue: '' } },
      isComplete: ({ date, time }) => date.length > 0 && time.length > 0,
    },
  },
}).configure()();

const setDate = form.stepSchema.value.step1.createUpdate
  .forFields(['fields'])
  .withInput((date: string) => date)
  .bind({
    updater: ({ current, input }) => ({
      ...current,
      date: { ...current.date, defaultValue: input },
      time: { ...current.time, defaultValue: '' },
    }),
  });

function chooseDate(date: string) {
  setDate(date);
}
```

This targets the fields object and returns updated field entries while preserving
their metadata. The updater reads `current` at execution time. Keep this action
as the date control's change handler so clearing the time is part of selecting
a new date, rather than an effect that runs after an inconsistent render.

The completion predicate prevents an empty time from being accepted. It does
not itself check that a nonempty time belongs to the chosen date; enforce that
constraint in your application and at submission.

## Derive a value when possible

A total calculated from quantity and price belongs in derived step state when
it is only a computation. Avoid storing another independently editable answer
that must be synchronized after every change.

For interface-only dependent state, a literal state entry with `select: 'date'`
can reset automatically when the date changes. See [step state](../../../core/v1/guides/step-state.md)
for the distinction between derived, literal, and selected state.

## Preserve structured answer types

| Answer | Control behavior |
| --- | --- |
| Boolean | Pass checked state |
| Number | Convert numeric input deliberately and handle empty input |
| Array | Return an updated array rather than mutating it in place |
| Object | Preserve unrelated properties while changing the intended property |
| Date | Convert from the control's text format to the definition's date representation |

Type empty array defaults with the element type you expect. Keep the field's
runtime shape compatible with the definition and use update APIs to notify
subscribers. Do not bypass shape errors with casts before checking the selected
path and expected value type.

## Fetch remote options from the current answer

Subscribe to the selected date, use it as the key for your application's
availability request, and render loading, empty, failure, and success states.
Before applying a response-driven default, check that it still belongs to the
current date and does not overwrite a newer explicit answer.

A lazy step definition is cached per instance; it is not a query that reruns
whenever a field changes. Use it to load structure, not to implement an
ever-changing options list.

## Next steps

- [Typed updates and helpers](../../../core/v1/guides/updates-and-helpers.md)
- [Async React fields](async-fields.md)
- [Reactive subscriptions](subscriptions.md)
