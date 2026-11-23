---
title: Component render utilities
description: Use selected context, step hooks, field selectors, and bound operations inside created React components.
order: 20
---

A created component receives utilities selected for its step scope. These are
bound to the schema that created the component, so they share its answers and
resolution lifecycle.

In this guide you will:

- Select resolution state with `useStep`.
- Read related answers in a field renderer.
- Choose event-time reads or subscriptions.
- Understand where custom props and context belong.

## Select a small part of step state

```tsx
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: { email: { defaultValue: '' }, confirmed: { defaultValue: false } },
    },
  },
}).configure()();

export const EmailStatus = form.stepSchema.value.step1.createComponent({
  render: function EmailStatus({ useStep }) {
    const email = useStep({ selector: ({ data }) => data.fields.email.defaultValue });

    return <output>{email}</output>;
  },
});
```

Without a selector, `useStep()` supplies `{ data, status, error }` and reacts to
the complete result. A selector can return one value or a derived object;
object/array selections use structural equality. `useSelector` instead selects
from the step-keyed context, such as `ctx.step1.fields.email.defaultValue`.

## Supply related values to one field

```tsx
export const ConfirmedEmail = form.stepSchema.value.step1.createComponent({
  render: function ConfirmedEmail({ Field }) {
    return (
      <Field name='email' selectorFn={(steps) => steps.step1.fields.confirmed.defaultValue}>
        {({ defaultValue, onInputChange, selected }) => (
          <label>
            Email {selected.value ? '(confirmed)' : '(unconfirmed)'}
            <input value={defaultValue} onChange={(event) => onInputChange(event.target.value)} />
          </label>
        )}
      </Field>
    );
  },
});
```

`selectorFn` adds `selected.value` to the field render input. It provides related
reactive data without changing the field's own value type. Field render input
also includes `reset` to restore that answer's original default.

## Choose the right read or operation

| Need | Utility |
| --- | --- |
| Reactive content without rerendering its parent | `Selector` |
| Reactive value used in component logic | `useSelector` or selected `useStep` |
| Resolution status and error | `useStep` |
| Loading fallback around resolving content | `Suspend` |
| Raw field values supplied to a form integration | `defaultValues` |
| Original step validator for an adapter | `validation` |
| Update one selected field | Field `onInputChange` |
| Update/reset through step paths | Render `update`, `onInputChange`, or `reset` utilities |

The step-level `onInputChange` utility is an update wrapper accepting field-path
options; the `Field` child callback's `onInputChange` accepts that field's value.
Do not interchange these signatures.

## Extend render input deliberately

Custom component props are the render callback's second parameter. `ctxData`
projects additional selected context when configuring a component; it should
describe data, not mutate the instance. Complete hook calls inside React render
and keep core domain helpers free of React hooks.

Single-step components receive the configured shared `Form` when `withForm` was
used, and a native `form` when a form-library adapter is enabled. Multi-step
summary components expose selected context rather than one combined native form.

## Next steps

- [Reusable field components](../guides/fields-and-components.md)
- [Post-commit hooks](scheduling.md)
- [Async rendering](../guides/async-fields.md)
