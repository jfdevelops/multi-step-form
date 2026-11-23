---
title: Create a React form
description: Build a two-step registration flow with typed inputs, completion checks, review, and submission.
order: 20
---

Build a registration flow that collects an email, shows a review, and hands a
typed payload to your application. This example uses native HTML controls.

In this guide you will:

- Define steps and completion rules.
- Bind an input to the shared instance.
- Navigate to a reactive review.
- Submit answers and handle request failures.

## Define the registration data

After [installing the React runtime](installation.md), create `registration.ts`:

```ts
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

export const createRegistrationForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact details',
      description: 'Where should we send your confirmation?',
      fields: {
        email: {
          defaultValue: '',
          isRequired: true,
          label: 'Email',
          placeholder: 'name@example.com',
        },
      },
      isComplete: ({ email }) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    },
    step2: {
      title: 'Review registration',
      fields: { accepted: { defaultValue: false, label: 'Confirm these details' } },
      isComplete: ({ accepted }) => accepted,
    },
  },
}).configure();

export const registration = createRegistrationForm().withContext();
```

The definition infers `email` as a string and `accepted` as a boolean. Completion
receives raw values. The email check is an example readiness rule; validate the
submitted payload on your server too.

This module creates one instance for a browser application. Calling the same
factory again retrieves that instance. For multiple workflows or server rendering,
read [instance lifetime](../../core/v1/guides/instances-and-storage.md).

## Bind a contact input

Create `contact-step.tsx`:

```tsx
import { registration } from './registration';

export const ContactStep = registration.stepSchema.value.step1.createComponent({
  render: function ContactStep({ Field }) {
    return (
      <Field name='email'>
        {({ defaultValue, label, placeholder, onInputChange, isRequired }) => (
          <label>
            {label}
            <input
              type='email'
              autoComplete='email'
              required={isRequired}
              placeholder={placeholder}
              value={defaultValue}
              onChange={(event) => onInputChange(event.target.value)}
            />
          </label>
        )}
      </Field>
    );
  },
});
```

`defaultValue` is the current answer. `onInputChange` updates the instance; you do
not need another `useState` for it. Metadata becomes HTML behavior when you pass
it to the input, such as `required={isRequired}`.

## Render a live review

Create `review-step.tsx`:

```tsx
import { registration } from './registration';

export const ReviewStep = registration.createComponent({
  stepData: ['step1', 'step2'],
  render: function ReviewStep({ Selector }) {
    return (
      <Selector selector={(steps) => steps.step1.fields.email.defaultValue}>
        {(email) => <p>Confirmation will be sent to {email}.</p>}
      </Selector>
    );
  },
});

export const Confirmation = registration.stepSchema.value.step2.createComponent({
  render: function Confirmation({ Field }) {
    return (
      <Field name='accepted'>
        {({ defaultValue, label, onInputChange }) => (
          <label>
            <input
              type='checkbox'
              checked={defaultValue}
              onChange={(event) => onInputChange(event.target.checked)}
            />
            {label}
          </label>
        )}
      </Field>
    );
  },
});
```

`Selector` subscribes to the answer, so edits appear in the review. A checkbox
writes `checked` to preserve the boolean expected by the definition.

## Connect navigation and submission

Create `registration-form.tsx`. Render it with an `onRegister` function that sends
the payload using your application's request client:

```tsx
import { useState, type FormEvent } from 'react';
import { ContactStep } from './contact-step';
import { Confirmation, ReviewStep } from './review-step';
import { registration } from './registration';

type RegistrationFormProps = {
  onRegister: (payload: { email: string }) => Promise<void>;
};

const { useMultiStepFormData } = registration.context;

export function RegistrationForm({ onRegister }: RegistrationFormProps) {
  const [step, setStep] = useState<'step1' | 'step2'>('step1');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');
  const canContinue = useMultiStepFormData((schema) =>
    schema.stepSchema.isStepComplete(step),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === 'saving') {
      return;
    }

    if (!registration.stepSchema.isStepComplete('step1')) {
      setError('Enter a valid email address.');
      setStep('step1');

      return;
    }

    if (step === 'step1') {
      setError('');
      setStep('step2');

      return;
    }

    if (!registration.stepSchema.isStepComplete('step2')) {
      setError('Confirm your details before registering.');

      return;
    }

    setError('');
    setStatus('saving');

    try {
      await onRegister({ email: registration.stepSchema.value.step1.fields.email.defaultValue });
      setStatus('saved');
    } catch {
      setStatus('idle');
      setError('Registration could not be saved. Please try again.');
    }
  }

  if (status === 'saved') {
    return <p role='status'>Your registration is confirmed.</p>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p>Step {step === 'step1' ? 1 : 2} of 2</p>
      {step === 'step1' ? <ContactStep /> : <><ReviewStep /><Confirmation /></>}
      {error && <p role='alert'>{error}</p>}
      {step === 'step2' && (
        <button type='button' disabled={status === 'saving'} onClick={() => setStep('step1')}>
          Back
        </button>
      )}
      <button type='submit' disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : step === 'step1' ? 'Review' : 'Register'}
      </button>
      {!canContinue && <p>Complete this step to continue.</p>}
    </form>
  );
}
```

The handler checks completion at the moment of action and checks both steps before
sending. `noValidate` makes this example's messages responsible for errors; remove
it if you also want native browser validation. The submit button remains available
so readers can request feedback about an incomplete step.

Send an explicit payload, not the schema object containing methods and metadata.
A failed request preserves the answers for retry. Navigation and request state
belong to this component; answers belong to the form instance.

## Retain a draft between visits

Replace `.configure()` in `registration.ts` with
`.configure({ storage: { key: 'registration-draft' } })` to enable browser storage.
Answers then survive reloads. This example's visible step remains React state
and starts at `step1`; store it in your router if navigation should resume too.

## Next steps

- [Reuse field components](guides/fields-and-components.md)
- [Add navigation and progress](guides/navigation-and-review.md)
- [Configure instances and storage](../../core/v1/guides/instances-and-storage.md)
- [Use TanStack Form](guides/tanstack-form.md)
