---
title: Async fields and loading states
description: Render fields after lazy definitions or overrides resolve and provide useful loading and retry behavior.
order: 80
---

Async steps and overrides let the form start from remote data. Render loading
and failure states explicitly so unresolved defaults do not appear as final
empty answers.

In this guide you will:

- Render a lazy step inside `Suspend`.
- Keep loading separate from errors.
- Retry resolution deliberately.
- Choose overrides for known field structures.

## Render after resolution

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

async function loadLanguage() {
  return 'English';
}

const form = defineMultiStepForm({
  steps: {
    step1: async () => ({
      title: 'Preferences',
      fields: { language: { defaultValue: await loadLanguage() } },
    }),
  },
}).configure()();

export const Preferences = form.stepSchema.value.step1.createComponent({
  render: function Preferences({ Suspend, Field }) {
    return (
      <Suspend fallback={<p role='status'>Loading preferences…</p>}>
        <Field name='language'>
          {({ defaultValue, onInputChange }) => (
            <label>
              Language
              <input value={defaultValue} onChange={(event) => onInputChange(event.target.value)} />
            </label>
          )}
        </Field>
      </Suspend>
    );
  },
});
```

Creating the definition and instance stays synchronous. The loader supplies a
complete step, including its fields. `Suspend` wraps field content that depends
on resolution and supplies a loading fallback.

## Present failures separately

A suspense fallback is loading UI, not an error message. Use your application's
React error boundary around content that can throw, or resolve the step before
rendering and handle the rejected promise in your loading flow.

The core APIs `getStepStatus`, `getStepError`, and `resolveStep` expose resolution
state. Calling `resolveStep` again retries a failed loader. Avoid repeated retry
loops during render; provide an action that makes the retry intentional.

## Prefill known fields with overrides

When fields are already known, keep a synchronous step definition and use
`withOverrides` to prefill its values. Preserve existing answers when a fetched
default is only a fallback. Complete the optional `withOverrides` → `withForm` →
`withContext` chain once before making components from its final schema.

Loaded definitions are cached per instance. Reset restores their original
defaults instead of refetching. Use an application query for data that must
refresh whenever an answer changes.

## Next steps

- [Async definitions and overrides](../../../core/v1/guides/async-data.md)
- [Dependent remote options](dependent-fields.md)
- [Troubleshoot loading](../troubleshooting.md)
