---
title: Dates, validation, and resolution
description: Choose date representations, understand completion precedence, and control lazy-step and override resolution.
order: 100
---

Date fields and asynchronous defaults have runtime behavior beyond their raw
TypeScript type. Use resolution utilities when implementing preloading or custom
loading boundaries.

In this guide you will:

- Choose a Date or string representation.
- Separate validation from explicit completion rules.
- Inspect and resolve async defaults.
- Build typed override projections.

## Choose how a date resolves

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const createForm = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Schedule',
      fields: {
        startsAt: { defaultValue: new Date('2030-01-15T09:00:00.000Z'), type: 'date' },
        dateText: {
          defaultValue: new Date('2030-01-15T00:00:00.000Z'),
          type: 'string',
          transform: (date) => date.toISOString().slice(0, 10),
        },
      },
    },
  },
}).configure();

const form = createForm();
```

The first field resolves as a `Date`. The second resolves as text using its
transform; without one, a string date field uses ISO formatting. Choose the
representation your control and endpoint expect, including the timezone meaning
of a calendar date versus a timestamp.

Stored JSON cannot preserve transform functions. The runtime restores metadata
from the current definition when reconciling stored answers. Do not reconstruct
field behavior solely from a saved JSON document.

## Understand completion precedence

An explicit step `isComplete` predicate determines completion when supplied.
Otherwise `validateFields` determines it when present. With neither, a step is
complete. A custom predicate can therefore replace validator-driven readiness
rather than automatically combining both rules.

Completion is synchronous. Use a synchronous supported validator for that
decision, and represent remote eligibility as resolved application state.
Validator transformations do not mean that every edited field has already been
replaced by transformed output.

## Inspect and preload defaults

| Utility on `stepSchema` | Use |
| --- | --- |
| `hasOverrides(step)` | Check whether a value-override callback exists |
| `getStepStatus(step)` | Inspect `idle`, `loading`, `resolved`, or `error` |
| `getStepError(step)` | Inspect the stored resolution failure |
| `resolveStep(step)` | Resolve defaults or a lazy definition, with a promise to await |
| `resolveOverrides(steps?)` | Start value-override resolution for selected non-lazy steps |
| `suspendStep(step)` | Return resolved data or throw its pending promise/error for a suspense host |

`resolveOverrides` skips lazy definitions and does not expose an awaitable batch
contract. Use `Promise.all` over `resolveStep` calls when a preload must await
specific steps. Failed resolution remains available through status and error
methods; resolving again retries.

## Extract a typed override projection

```ts
const dateOverride = createForm.createValueOverride({
  step: 'step1',
  values: ({ fields }) => ({ dateText: fields.dateText.defaultValue }),
});

const prefilled = form.withOverrides({ step1: dateOverride });
```

The factory utility infers the selected step's fields and raw-value patch.
Attach the result before rendering and retain the returned schema. For shared
defaults, use `defaultOverrides` during factory configuration.

## Next steps

- [Async definition workflow](../guides/async-data.md)
- [React loading boundaries](../../../react/v1/guides/async-fields.md)
- [Low-level override helpers](composition.md)
