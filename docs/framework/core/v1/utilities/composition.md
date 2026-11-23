---
title: Low-level composition
description: Build callable utility APIs and understand the lower-level construction and override helpers.
order: 80
---

Low-level helpers support custom adapters and library extensions. Use the
configured runtime when you want it to own storage, notifications, and instance
selection; use these helpers when implementing part of that machinery yourself.

In this guide you will:

- Compose a callable API with assigned methods.
- Combine conditions without losing logical grouping.
- Normalize fields and steps without creating a full workflow.
- Understand override scheduling responsibilities.

## Compose a callable utility

```ts
import { sharedFieldFunction } from '@jfdevelops/multi-step-form-core';

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

const base = sharedFieldFunction.registerFunction({ type: 'base', value: normalizeEmail });
const isEmpty = base.registerFunction({ type: 'assigned', value: (value: string) => value.trim() === '' });
const email = sharedFieldFunction({
  base,
  assignedFunctions: { isEmpty },
  assignedProperties: { kind: 'email' as const },
});

const normalized = email(' Reader@Example.com ');
const empty = email.isEmpty('');
```

The result retains the base call signature and assigned methods/properties.
Composition assigns members to the base function; it does not clone it. Avoid
reusing that same base function for incompatible independent APIs.

`combineFieldFunctionConditions(inherited, additional)` returns the available
expression, or combines both under AND while retaining nested OR groups. Use
it when writing an operation wrapper that adds rules without modifying either
input expression.

## Normalize raw definitions

| Helper | Use when |
| --- | --- |
| `instantiateFields` | Resolving field defaults, names, labels, casing, and date representation |
| `instantiateSteps` | Building resolved steps and their utilities from a steps config |
| `resolveStepState` | Recomputing derived state or resetting selected literal entries |
| `isValidFieldConfig` | Checking a field-config shape before normalization |
| `isValidSteps` | Checking the runtime steps-config shape |
| `MultiStepFormStepSchema.hasData` | Checking whether a value has the supported step-data shape |

These are not a substitute for server validation of arbitrary JSON. Guards check
the shapes they implement, not every domain rule or authorization requirement.
`instantiateFields` takes a configuration object containing `fields` and an
optional `defaultCasing`; `instantiateSteps` takes a configuration with `steps`.
For standard use, `defineMultiStepForm` already handles the required construction.

`createStepUpdate` and `createStepReset` are exported construction hooks marked
internal in source. They connect live-context callbacks to operation scopes.
Use `createUpdate.forStep` and `createReset.forStep` on a live step in application
code rather than constructing those runtime callbacks yourself.

## Reuse override projections

Factory `createValueOverride({ step, values })` gives a typed way to describe a
step's raw-value override. The root `createValueOverride` wraps a projection
without itself selecting an active instance or applying the returned values.

`mergeStepOverrides` attaches override callbacks to step configurations,
including lazy steps. It does not eagerly fetch or apply defaults.
`scheduleOverrideResolution(instance, getCurrentInstance)` schedules a microtask
and resolves only if the same instance is still current. Custom instance
rebuilders can use it to avoid resolving a superseded schema.

`MultiStepFormDefinition` is the core definition class returned by the public
factory. `DEFAULT_INSTANCE_NAME` is the default factory name. Prefer inference
from `defineMultiStepForm` over manually constructing broad class generics.

## Next steps

- [Bound helper functions](helper-functions.md)
- [Override lifecycle](../guides/async-data.md)
- [React post-commit scheduling](../../../react/v1/utilities/scheduling.md)
