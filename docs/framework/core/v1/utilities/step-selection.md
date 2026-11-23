---
title: Step selection and parsing
description: Transform step keys, validate route input, and select context for shared operations.
order: 20
---

Step utilities turn the form's actual step set into navigation values and
parsers. Use them instead of maintaining a second list of valid screens.

In this guide you will:

- Transform keys into strings, numbers, or arrays.
- Distinguish whole-array validation from member validation.
- Select step context with tuple and object notation.

## Parse a selected step

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const form = defineMultiStepForm({
  steps: {
    step1: { title: 'Contact', fields: { email: { defaultValue: '' } } },
    step2: { title: 'Review', fields: { accepted: { defaultValue: false } } },
  },
}).configure()();

const keys = form.stepSchema.steps.as('string.keys');
const requested: unknown = 'step2';
const target = keys.allows(requested) ? requested : 'step1';
const parsed = keys.parse(target);
```

`allows` returns a boolean and narrows a valid member. `parse` returns a member
or throws for an invalid value. Use a fallback for optional route input, and a
throwing parser at a boundary where invalid input should be rejected.

## Choose a representation

| `as` option | Value representation | Member values |
| --- | --- | --- |
| `string.keys` | Quoted key-union expression | `step1`, `step2` |
| `string` | Quoted numeric-string union expression | `'1'`, `'2'` |
| `number` | Numeric union expression | `1`, `2` |
| `array.string.keys` | Key array | `step1`, `step2` |
| `array.string` | Numeric-string array | `'1'`, `'2'` |
| `array.number` | Number array | `1`, `2` |
| `array.string.untyped` | Widened string key array | String keys |

Read `.value` for the transformed representation. Scalar `.value` is an
expression string for tooling, not the currently selected step.

## Validate a member of an array

```ts
const stepArray = form.stepSchema.steps.as('array.string.keys');
const validSet = stepArray.allows(['step2', 'step1']);
const validMember = stepArray.allows.in('step2');
const member = stepArray.parse.in('step1');
```

Whole-array `allows` and `parse` require the complete transformed collection;
ordering does not matter, but contents and multiplicity must match. Use `.in`
for one member or when filtering candidates. It is not a subset validator.

`steps.isValidStep` checks a string key or numeric step. Its exported factory,
`createIsValidStepFn`, builds that check from numeric step numbers. For strict
untrusted string membership, prefer the `as(...).allows` parser above rather
than relying on numeric extraction. `VALIDATED_STEP_REGEX` checks only a key's
format, not its presence in a particular form.

## Select context for a helper

```ts
import { createCtx, HelperFnChosenSteps } from '@jfdevelops/multi-step-form-core';

const contact = createCtx(form.stepSchema.value, ['step1']);
const both = createCtx(form.stepSchema.value, { step1: true, step2: true });
const isSelection = HelperFnChosenSteps.isValid(['step1'], ['step1', 'step2']);
```

Selectors accept `'all'`, a tuple of keys, or an object whose selected keys are
`true`. `createCtx` builds selected step context; it does not subscribe or clone
the form. Prefer the context supplied by `createHelperFn` when creating actions.

`HelperFnChosenSteps.isAll`, `isTuple`, and `isObject` identify selector shapes;
pass valid keys to the latter checks when membership matters. `resolveType`
identifies the chosen notation; `match` dispatches to notation-specific callbacks.
`createCatchAllMessage` formats valid selector choices for tooling diagnostics.

## Next steps

- [Build shared helpers](helper-functions.md)
- [Read nested answers](values-and-paths.md)
- [Navigation and review](../../../react/v1/guides/navigation-and-review.md)
