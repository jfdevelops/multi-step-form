---
title: Overview
description: Understand the form runtime, React integration, and optional form builder.
order: 0
---

Multi Step Form turns typed step definitions into a shared form store. Use it for
registration, checkout, applications, and scheduling workflows where answers must
survive moving between screens.

You define data and completion rules. The library supplies independent instances,
field updates, subscriptions, persistence, and typed React component factories.
Your application supplies inputs, layout, navigation, and submission.

## Follow an answer through the form

```text
Definition: fields + step metadata + completion rules
                         ↓ configure()
Factory:                 createRegistrationForm
                         ↓ createRegistrationForm()
Instance:                answers + state + storage + subscriptions
                         ↓ createComponent()
Interface:               contact → preferences → review → your server
```

Typing in a `Field` calls `onInputChange`. The instance updates the field,
recalculates derived state and completion, notifies subscribers, and persists
when storage is enabled. A review subscribes to the same answers without keeping
another copy in React state.

Despite its name, a resolved field's `defaultValue` is its **current answer**.
The original definition supplies defaults used by resets.

## Learn the vocabulary

| Term | Meaning | Example |
| --- | --- | --- |
| Definition | Steps, fields, metadata, completion rules | `defineMultiStepForm({ steps })` |
| Factory | Configured creator and registry of instances | `definition.configure()` |
| Instance | Independent answers and resolved state | `createForm()` |
| Step | Named group of fields | `step1`, `step2` |
| Field | Value and rendering metadata | `email`, `isRequired`, `placeholder` |
| Step state | Mutable or derived data beside answers | An open panel or computed summary |
| Component factory | Typed binding of a component to form data | `step.createComponent({ render })` |
| Builder | Editor for designing definitions | `createFormBuilder()` |

## Choose a learning path

| Goal | Read |
| --- | --- |
| Build a working React form | [Complete walkthrough](quick-start.md) |
| Reuse input components | [Fields and components](guides/fields-and-components.md) |
| Move between steps and show answers | [Navigation and review](guides/navigation-and-review.md) |
| Resume drafts | [Instances and storage](../../core/v1/guides/instances-and-storage.md) |
| Use native TanStack Form APIs | [TanStack Form](guides/tanstack-form.md) |
| Let users design forms | [Builder documentation](builder/overview.md) |
| Work with dependent answers | [Dependent fields](guides/dependent-fields.md) |
| Load remote defaults in React | [Async fields](guides/async-fields.md) |
| Design labels, errors, and focus behavior | [Accessibility](guides/accessibility.md) |
| Find hooks and component utility functions | [React utilities](utilities/overview.md) |
| Extract values, parse steps, or write shared actions | [Core utilities](../../core/v1/utilities/overview.md) |
| Manage forms without React | [Core overview](../../core/v1/overview.md) |

Runtime persistence stores answers. Builder persistence stores the editable form
definition. Installing the runtime does not require installing the builder.

## Keep application decisions explicit

The library has no built-in current-page router or submission endpoint. Store the
visible step in React state or your router, check completion before advancing,
and construct the payload your server expects. `isComplete` reports readiness;
it does not navigate or display errors by itself.

Components are headless. Native HTML or your design system can render the same
fields. Supply labels, input types, and error feedback in the rendered controls.

## Next steps

- [Install packages](installation.md)
- [Build a complete form](quick-start.md)
- [Update values and write helpers](../../core/v1/guides/updates-and-helpers.md)
