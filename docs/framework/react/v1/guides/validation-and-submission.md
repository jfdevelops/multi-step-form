---
title: Validation and submission
description: Separate completion, input feedback, and server validation while preserving answers through failed submissions.
order: 50
---

Completion tells your application whether a step is ready. Input feedback tells
the reader what to fix. Submission validates the complete payload and sends it to
your server. Treat these as explicit parts of the workflow.

In this guide you will:

- Define step readiness.
- Present actionable validation feedback.
- Submit an explicit payload.
- Preserve answers when a request fails.

## Define readiness from raw values

```ts
isComplete: ({ firstName, email }) =>
  firstName.trim().length > 0 && email.includes('@')
```

This predicate belongs on a step with those fields. It receives raw current
values, not metadata. Read the result through `step.isComplete` or
`form.stepSchema.isStepComplete('step1')`. An explicit predicate determines
readiness; otherwise `validateFields` determines it when supplied. With neither,
the step is complete. Required metadata alone does not establish a navigation gate.

Use a schema validator for richer rules when appropriate. Keep readiness
synchronous; fetch availability or permissions separately and represent their
resolved status in your application. Recheck server-owned constraints when the
request reaches the server.

## Show errors at an intentional time

Choose whether to show messages after blur, after a submit attempt, or while
typing. `errorMessage` supplies field metadata but does not choose that timing or
render an error automatically. Pass messages to your controls, connect them with
`aria-describedby`, and use `aria-invalid` when a visible error applies.

For an incomplete Continue attempt, show the missing requirement and keep the
reader on the step. The [walkthrough](../quick-start.md) demonstrates a form-level
alert. Larger forms can show field-level errors and move focus to the first
invalid control or an error summary.

Use [TanStack Form](tanstack-form.md) when you want native field meta state,
validation events, and subscriptions inside a step.

## Construct the request payload

```ts
const { email } = registration.stepSchema.value.step1.fields;
const payload = { email: email.defaultValue };
await onRegister(payload);
```

This continues the walkthrough's application callback. Read current values at
submission time and include only the data your endpoint expects. The schema
contains methods, metadata, and possibly interface state; it is not an API body.
Map dates and other structured values to the format your endpoint accepts.

Before sending, check every required step, not just the screen being displayed.
The server should validate the submitted values independently.

## Handle pending, failure, and success

| State | Interface behavior |
| --- | --- |
| Pending | Disable repeat submission and communicate progress |
| Field error | Show the message beside the corresponding control and allow correction |
| Request failure | Keep answers and offer retry |
| Success | Show confirmation and deliberately clear or retain the draft |

Reset after confirmed success if the workflow should start fresh. Do not clear
the form before awaiting the request, since a rejected request would lose the
reader's work. A persisted draft and an in-memory instance have separate lifetime
concerns; ensure both match your intended restart behavior.

## Next steps

- [Complete submission example](../quick-start.md#connect-navigation-and-submission)
- [Configure TanStack validation](tanstack-form.md)
- [Reset selected values](../../../core/v1/guides/updates-and-helpers.md#reset-selected-values)
