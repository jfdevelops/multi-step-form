---
title: Values and field paths
description: Extract raw step answers and translate nested field names into resolved value paths.
order: 10
---

Use value helpers when preparing request payloads, integrating another form
library, or writing a generic control for nested answers.

In this guide you will:

- Extract a step's raw answers.
- Distinguish field names from metadata paths.
- Resolve nested values without duplicating path rules.

## Extract current answers

```ts
import { defineMultiStepForm, getDefaultValues } from '@jfdevelops/multi-step-form-core';

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: {
        email: { defaultValue: '' },
        address: { defaultValue: { city: '', postalCode: '' } },
      },
    },
  },
}).configure()();

const answers = getDefaultValues(form.stepSchema.value, 'step1');
```

`answers` has `email` and `address`, without labels, field methods, or other
metadata. Despite its name, `getDefaultValues` extracts the values in the
resolved steps supplied to it, so these are current answers after edits.
It does not deep-clone nested objects; treat the result as read-only input or
copy it before independent editing.

There is also a type named `getDefaultValues`. Use it with `import type` to
describe the inferred answer shape without executing the extraction.

## Translate a field name into a value path

```ts
import { buildValuePath } from '@jfdevelops/multi-step-form-core';

const emailPath = buildValuePath('email');
const cityPath = buildValuePath('address.city');
```

The results are `email.defaultValue` and `address.defaultValue.city`. This is a
path within the **fields object**. A step update path also needs its `fields.`
prefix: `fields.address.defaultValue.city`.

`buildValuePath` accepts an alternate value-property name as its second argument
for integrations with another field shape. It builds a string; it does not prove
that a field exists in your form.

## Read a nested answer

```ts
const city = form.stepSchema.getValue('step1', 'address.city');
const selectedStep = form.stepSchema.get({ step: 'step1' });
```

`getValue` resolves the field path into the current answer. `get` returns
`{ step, data }` for the selected step. These are direct reads, suitable for
event-time decisions; React consumers should subscribe for visible data.

The lower-level `resolvedDeepPath(fieldPath, fields, filler)` reads through a
fields object using the same inserted `defaultValue` segment. Prefer
`stepSchema.getValue` when you already own a schema, because it also identifies
the target step and reports invalid context through the runtime's errors.

## Keep the path vocabulary straight

| Context | Example |
| --- | --- |
| React field name or `getValue` | `address.city` |
| `buildValuePath` output | `address.defaultValue.city` |
| Step update/reset selection | `fields.address.defaultValue.city` |
| Builder schema path | `['address', 'city']` only when those are schema properties |

Do not reuse a builder schema path as a runtime field path. They address different
objects and use different traversal rules.

## Next steps

- [Build scoped actions](action-factories.md)
- [Extract field types](type-utilities.md)
- [React subscriptions](../../../react/v1/guides/subscriptions.md)
