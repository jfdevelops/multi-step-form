---
title: Type utilities
description: Extract answers and field paths, preserve inferred contracts, and compose generic integration types.
order: 90
---

Public type utilities let adapters describe the same answers and paths as the
runtime. Prefer inference for concrete definitions; extract types where a shared
component or helper needs a named contract.

In this guide you will:

- Extract raw values and nested field types.
- Distinguish configured and resolved types.
- Choose general object utilities deliberately.

## Extract types from the resolved schema

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';
import type {
  getDefaultValues, getFieldsForStep, getFieldConfig, getDeepFields,
  resolveDeepFieldPath, StepNumbers,
} from '@jfdevelops/multi-step-form-core';

const form = defineMultiStepForm({
  steps: {
    step1: {
      title: 'Contact',
      fields: { address: { defaultValue: { city: '' } } },
    },
  },
}).configure()();

type Steps = typeof form.stepSchema.value;
type Step = StepNumbers<Steps>;
type Answers = getDefaultValues<Steps, 'step1'>;
type Fields = getFieldsForStep<Steps, 'step1'>;
type Paths = getDeepFields<Steps, 'step1'>;
type City = resolveDeepFieldPath<Steps, 'step1', 'address.city'>;
type AddressMetadata = getFieldConfig<Steps, 'step1', 'address.city'>;
```

`getFieldForStep` aliases the fields-selection concept. `getCurrentStep` extracts
one resolved step. `parentOf` selects a path's first segment and
`removeParentPath` removes it. These types describe paths; they do not validate
a runtime string from a request.

## Recognize configuration and resolution types

| Family | Purpose |
| --- | --- |
| `DefineMultiStepFormOptions`, `ConfigureOptions` | Definition and factory configuration |
| `InstanceName`, `StorageKey`, `WithOverridesMap` | Named-instance and override contracts |
| `StepConfig`, `FieldConfig`, `BaseFieldOptions` | Input definition shapes |
| `instantiateSteps`, `instantiateFields`, `StepResolvedData` | Resolved data types; some names also have runtime functions |
| `StepDefaultValues`, `inferDefaultValue` | Values inferred from field configurations |
| `StepStateConfig`, `StepStateItem`, `InstantiateStepState` | Literal and derived step-state contracts |
| `AsyncStepMap`, `ResolvedStepMap`, `RequireAsyncStep` | Lazy-step definition typing |
| `HelperFn`, `HelperFnInput`, `HelperFnOutput`, `UpdateFn`, `ResetFn` | Selected callback and operation contracts |
| `Update`, `Reset`, `UpdateResult` | Reusable operation scopes and results |
| `ResolveValidatorInput` | Caller input accepted by a supported validator |

Use `DateFieldConfig`, `DateFieldType`, `DateFieldTypeMap`, and
`ResolvedDateFieldType` when adapting date input representation. Label-related
types include `CasingType`, `DefaultCasing`, `ChangeCasing`, `ChangeObjectCasing`,
`NameTransformCasingOptions`, `inferNameTransformCasing`, `inferLabel`, and
`inferIsRequired`. Type-level casing describes inferred names; runtime helpers
still perform the actual conversion.

## Choose general-purpose type transformations

| Utility | Use |
| --- | --- |
| `Expand`, `Show` | Expand mapped object structure for inspection |
| `Override` | Replace a property type while preserving its optionality |
| `DeepKeys`, `DeepValue` | Describe nested object paths and values |
| `DeepPartial`, `RemoveReadonly` | Relax nested patches or top-level readonly properties |
| `Updater`, `inferUpdaterReturn` | Describe a value-or-updater input and its return |
| `Split`, `Join` | Transform literal path strings and tuples |
| `RequireAtLeastOne` | Require at least one property from an option set |
| `UnionToTuple`, `unionHelpers` | Inspect or transform unions |
| `objectHelpers`, `IsString`, `stripFunctions` | Narrow or remove categories of properties |
| `Constrain`, `SetDefaultString`, `WidenSpecial`, `Relaxed` | Model fallback and widened generic contracts |

`Constrain` includes its fallback type, so it is not simply an intersection that
preserves every narrow literal. `Relaxed` and `WidenSpecial` intentionally widen
certain values. Do not apply them to a concrete form merely to silence a type
error that points to the wrong path or value shape.

## Next steps

- [TypeScript basics](../typescript.md)
- [Value extraction](values-and-paths.md)
- [Action scopes](action-factories.md)
