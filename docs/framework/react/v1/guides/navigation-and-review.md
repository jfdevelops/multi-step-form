---
title: Navigation, progress, and review
description: Choose the visible step, gate forward navigation, and render a review from shared answers.
order: 40
---

Your application owns the visible step. Keep it in React state for a local wizard
or in a router for addressable screens, while the form instance retains answers.

In this guide you will:

- Check readiness before moving forward.
- Show progress for the visible step.
- Review answers without duplicating them.
- Handle edits that invalidate later decisions.

## Gate forward navigation

The [walkthrough](../quick-start.md) uses `useState<'step1' | 'step2'>` to select
the screen. Check the current instance immediately before advancing:

```ts
if (registration.stepSchema.isStepComplete('step1')) {
  setStep('step2');
}
```

Use the reactive hook for the UI and the direct completion read for the action.
`isComplete` does not prevent a route change by itself. Apply the same rule to
Continue, step links, and deep links if they must all enforce prerequisites.

Going back should normally preserve answers and remain possible even when a
step is incomplete. Use `type='button'` for Back and other non-submit controls.
Keep forward navigation in the form's submit handler so Enter behaves like
pressing Continue.

## Display progress

With the walkthrough's `registration` instance:

```tsx
const { useProgress } = registration.context;

export function RegistrationProgress({ step }: { step: 'step1' | 'step2' }) {
  const { value, maxProgressValue, ProgressText } = useProgress({ targetStep: step });

  return (
    <div>
      <ProgressText />
      <progress aria-label='Registration progress' value={value} max={maxProgressValue} />
    </div>
  );
}
```

`useProgress` derives the displayed position from the numeric suffix in step
keys and the total step count. It measures position, not how many completion
predicates pass. Use sequential `step1`, `step2`, and so on. For a completion
indicator, separately subscribe to `isStepComplete` for each step.

## Review the source of truth

Use a multi-step component and a `Selector` to read answers from the same
instance. The [review example](../quick-start.md#render-a-live-review) stays
current after Back and Edit actions because it stores no duplicate email value.

Show meaningful labels and formatted values in a review. For structured fields,
render their domain properties, such as ticket names and quantities, rather than
an object dump. Keep submitted payloads explicit and separate from display
formatting.

## Invalidate dependent decisions

If changing a date invalidates a selected time, clear or recompute that dependent
value. [Selected step state](../../../core/v1/guides/step-state.md) can reset a
literal state entry when its selected field changes. Use an explicit update for
dependent answers represented as fields.

A confirmation checkbox may also need to clear after reviewed answers change.
The runtime does not infer that business dependency. Recheck all required steps
at final submission, including when the user reaches review through a saved URL.

## Next steps

- [Validate and submit](validation-and-submission.md)
- [Subscribe to form values](subscriptions.md)
- [Update dependent values](../../../core/v1/guides/updates-and-helpers.md)
