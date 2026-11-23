---
title: Fields and components
description: Bind native inputs, reuse field renderers, and select the component scope that matches your interface.
order: 20
---

Component factories connect your controls to typed form values. Use a step
component for a section, a field component for a reusable input, and a multi-step
component for summaries spanning several steps.

In this guide you will:

- Choose a component scope.
- Render metadata as accessible input behavior.
- Reuse one renderer for several fields.
- Bind shared components to an explicit instance.

## Choose a component scope

| Factory | Use it for |
| --- | --- |
| `form.stepSchema.value.step1.createComponent({ render })` | A component bound to one instance and step |
| `form.createComponent({ stepData: ['step1', 'step2'], render })` | Review or summary across selected steps |
| `step.createComponent.forField({ field, render })` | A single field control |
| `step.createComponent.forField({ fields, render })` | A renderer that can bind to several fields |

Create components outside other components' render functions so their identity
remains stable. Use the final schema returned by any configuration chain.

## Render values and metadata together

This example continues with `registration` from the [walkthrough](../quick-start.md):

```tsx
import { registration } from './registration';

export const EmailInput = registration.stepSchema.value.step1.createComponent.forField({
  field: 'email',
  render: function EmailInput(field) {
    return (
      <label>
        {field.label}
        <input
          type='email'
          required={field.isRequired}
          placeholder={field.placeholder}
          value={field.defaultValue}
          onChange={(event) => field.onInputChange(event.target.value)}
        />
      </label>
    );
  },
});
```

`isRequired`, `placeholder`, and `errorMessage` describe a field; your renderer
decides how to present them. Without an explicit label, the library derives one
from the name and appends `*` for required fields. Explicit labels remain as given.

Use `value` for controlled text inputs and `checked` for booleans. Convert number
input text deliberately before calling `onInputChange`; an empty numeric input
needs a representation your field type permits. Do not stringify arrays or
objects to fit a text input when the field represents structured data.

## Reuse one renderer for related fields

For a contact step containing string fields `firstName` and `lastName`:

```tsx
const NameInput = form.stepSchema.value.step1.createComponent.forField({
  fields: ['firstName', 'lastName'],
  render: function NameInput(field) {
    return (
      <label>
        {field.label}
        <input
          value={field.defaultValue}
          onChange={(event) => field.onInputChange(event.target.value)}
        />
      </label>
    );
  },
});

const FirstName = NameInput.bindToField('firstName');
const LastName = NameInput.bindToField('lastName');
```

Render `<FirstName />` and `<LastName />` without repeating their bindings.
Restrict `fields` to compatible values so the renderer can handle every selected
field. Custom props belong in the render function's second parameter.

## Share a renderer across instances

Factory-level field components can be reused with explicit instances:

```tsx
const SharedEmail = createRegistrationForm.createComponent.forField({
  step: 'step1',
  field: 'email',
  render: function SharedEmail(field) {
    return <input aria-label='Email' value={field.defaultValue}
      onChange={(event) => field.onInputChange(event.target.value)} />;
  },
});

const RegistrationEmail = SharedEmail.bindToInstance(registration);
```

Import `createRegistrationForm` and `registration` from the walkthrough module.
Render `<RegistrationEmail />`, or pass `instance={registration}` to the shared
component. Binding keeps the component aimed at that instance without depending
on whichever instance was last active.

## Next steps

- [Subscribe to selected values](subscriptions.md)
- [Show validation feedback](validation-and-submission.md)
- [Use native TanStack fields](tanstack-form.md)
