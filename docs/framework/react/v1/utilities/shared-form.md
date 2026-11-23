---
title: Shared form render helpers
description: Use live step data, progress, and completion inside a reusable form layout without additional hooks.
order: 40
---

`withForm` supplies a shared layout to created step components. Its render
context includes live getters so layout code can display progress and readiness
without reaching for another instance or duplicating answer state.

In this guide you will:

- Configure a shared form with custom props.
- Read current step data and progress.
- Restrict the form to selected steps.
- Preserve HTML form semantics.

## Configure the layout

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';
import type { ComponentProps } from 'react';

type LayoutProps = ComponentProps<'form'> & { targetStep: 'step1' };

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: { email: { defaultValue: '' } },
      isComplete: ({ email }) => email.includes('@'),
    },
  },
}).configure()().withForm({
  render: function ContactLayout({ id, getCurrentStepData, getProgress, isStepComplete }, props: LayoutProps) {
    const { targetStep, children, ...formProps } = props;
    const current = getCurrentStepData({ targetStep });

    if (!current.hasData) {
      return <current.NoCurrentData />;
    }

    const { ProgressText } = getProgress({ targetStep });

    return (
      <form {...formProps} id={id}>
        <h2>{current.data.title}</h2>
        <ProgressText />
        {children}
        {!isStepComplete(targetStep) && <p>Complete the contact details to continue.</p>}
      </form>
    );
  },
});
```

The layout's `steps` context also provides current resolved step data for broader
summaries. `getCurrentStepData`, `getProgress`, and `isStepComplete` read that
live context without requiring hooks in the layout callback.

## Use the injected component

```tsx
export const Contact = form.stepSchema.value.step1.createComponent({
  render: function Contact({ Form, Field }) {
    return (
      <Form targetStep='step1' onSubmit={(event) => event.preventDefault()}>
        <Field name='email'>
          {({ defaultValue, onInputChange }) => (
            <input aria-label='Email' value={defaultValue}
              onChange={(event) => onInputChange(event.target.value)} />
          )}
        </Field>
      </Form>
    );
  },
});
```

This demonstrates layout binding, not submission. Add your navigation or request
handler to `onSubmit`. The injected form is already an HTML form here, so do not
wrap the component in another form.

## Configure availability and naming

`id` supplies a custom form ID; otherwise the current step key supplies the
default. `alias` changes the injected component's name from `Form`.
`enabledForSteps` accepts the step-selection vocabulary to restrict availability.
The render callback's second parameter determines its custom props contract.

Complete `withOverrides` before `withForm`, and `withContext` afterward when
needed. Create components from the final schema. The named layout helpers report
data and readiness; your application still enforces navigation and submission.

## Next steps

- [Context hooks](context-hooks.md)
- [Component render input](component-utilities.md)
- [Navigation and review](../guides/navigation-and-review.md)
