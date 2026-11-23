---
title: TypeScript
description: Preserve inferred field values, extract step types, and choose typed public APIs.
order: 10
---

The definition is the source of field and step types. Keep it concrete so input
bindings, update paths, and helper contexts can infer the same contract.

## Infer from defaults

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';
import type { getDefaultValues, StepNumbers } from '@jfdevelops/multi-step-form-core';

const definition = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Registration',
      fields: {
        email: { defaultValue: '' },
        quantity: { defaultValue: 1 },
        confirmed: { defaultValue: false },
      },
    },
  },
});

type Step = typeof definition.stepNumbers;
type ResolvedStep = StepNumbers<typeof definition.stepSchema.value>;
type RegistrationValues = getDefaultValues<typeof definition.stepSchema.value, 'step1'>;
```

`Step` and `ResolvedStep` identify `step1`. `RegistrationValues` describes the raw
answers rather than metadata. `stepNumbers` is a declared-only type surface; do
not read it as a runtime array. For runtime keys, use
`definition.stepSchema.steps.as('array.string.keys').value`.

## Give structured defaults useful types

```ts
type Attendee = { id: string; name: string };
const initialAttendees: Attendee[] = [];
```

Use `initialAttendees` as the field's `defaultValue`. An untyped empty array may
infer an element type too narrow for later additions. Likewise, type nullable
or union defaults intentionally when a field can hold several shapes.

Keep inferred factory types instead of annotating every definition with a broad
schema type. Avoid `any` and casts that hide invalid field names or incompatible
values. A type error on an update often means the path selects metadata instead
of the answer, or the returned value does not match the selected structure.

## Keep validation and types aligned

Types check application code; completion and validation check runtime values.
Neither substitutes for validating a network payload. Use the public package
entry points in application code; internal exports are implementation details.

The React package exposes its own `defineMultiStepForm`, which produces React
component factories in addition to core behavior. Import the React definition
function when you need `createComponent`.

## Next steps

- [Write typed updates](guides/updates-and-helpers.md)
- [Use React fields](../../react/v1/guides/fields-and-components.md)
- [Compile builder definitions](../../react/v1/builder/definitions.md)
