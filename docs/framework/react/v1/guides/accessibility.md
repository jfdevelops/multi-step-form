---
title: Accessible form interactions
description: Connect labels and error messages, preserve keyboard submission, and manage focus between steps.
order: 90
---

Headless field bindings leave markup and interaction design to your application.
Use semantic HTML and explicit feedback so each step works with keyboard and
assistive technology.

In this guide you will:

- Connect controls to labels and error messages.
- Preserve native form submission behavior.
- Announce loading and submission status.
- Move focus deliberately after navigation.

## Give every control an accessible name

A visible `<label>` can wrap the input, as in the [walkthrough](../quick-start.md).
For separate elements, use a unique input ID and matching `htmlFor`. Generate
IDs with React `useId` when the same component can appear more than once.

The runtime's `label` metadata is text; it only becomes an accessible name when
your renderer associates it with the control. A placeholder is a hint and should
not replace the label.

## Connect visible errors

```tsx
import { useId } from 'react';

export function EmailControl({ value, error, onChange }: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>Email</label>
      <input id={id} type='email' value={value}
        aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)} />
      {error && <p id={errorId}>{error}</p>}
    </div>
  );
}
```

Bind `value` and `onChange` to a field's current value and `onInputChange`.
Choose error timing from blur, change, or an attempted submission. For a large
step, an error summary can link to invalid inputs and provide one place to focus
after a blocked Continue attempt.

## Use native form and button semantics

Keep one HTML form around a step's controls. Handle forward actions in
`onSubmit` so Enter matches the Continue button. Back, reset-preview, and editor
actions should use `type='button'` unless they intentionally submit the form.

Group related options with `fieldset` and `legend`. Keep progress understandable
with text such as “Step 2 of 3”; a percentage alone does not explain where the
reader is in the workflow.

## Announce state changes without losing context

Use a status region for loading or successful submission and visible feedback
for failed requests. Keep answers intact after failures. After changing steps,
move focus to the new heading or first relevant control according to the flow;
the form store does not manage that focus for you.

Avoid announcing every keystroke as an error. A disabled Continue button should
not be the only explanation for why the reader cannot proceed.

For the builder, preserve supplied refs, event handlers, and ARIA props when
rendering custom elements. Keep keyboard and button alternatives to dragging.

## Next steps

- [Validation feedback](validation-and-submission.md)
- [Navigation and progress](navigation-and-review.md)
- [Accessible builder controls](../builder/inspector.md)
