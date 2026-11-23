---
title: Helper functions and context
description: Encapsulate validated domain operations with selected steps, computed context, and explicit instance targeting.
order: 30
---

`createHelperFn` packages an operation with typed context and update/reset
utilities. Use it when several controls need the same domain behavior.

In this guide you will:

- Create an operation without caller input.
- Validate an operation's input.
- Coordinate selected steps.
- Choose stable instance targeting.

## Define a bound operation

```ts
import { defineMultiStepForm } from '@jfdevelops/multi-step-form-core';

const form = defineMultiStepForm({
  steps: {
    step1: { title: 'Tickets', fields: { quantity: { defaultValue: 1 } } },
    step2: { title: 'Review', fields: { accepted: { defaultValue: false } } },
  },
}).configure()();

const increaseQuantity = form.stepSchema.value.step1.createHelperFn(({ ctx, update }) => {
  update.step1({
    fields: ['fields.quantity.defaultValue'],
    updater: ctx.step1.fields.quantity.defaultValue + 1,
  });
});

increaseQuantity();
```

The helper reads current context when called. It remains bound to `form` rather
than whichever instance another screen most recently selected.

## Validate caller input

This example uses ArkType's synchronous Standard Schema validator. Install it
directly in the application if it is not already a dependency:

```npm
npm i arktype
```

```pnpm
pnpm add arktype
```

```yarn
yarn add arktype
```

```bun
bun add arktype
```

```ts
import { type } from 'arktype';

const setQuantity = form.stepSchema.value.step1.createHelperFn({
  validator: type('number.integer > 0'),
}, ({ data, update }) => {
  update.step1({ fields: ['fields.quantity.defaultValue'], updater: data });
});

setQuantity({ data: 3 });
```

Use a synchronous Standard Schema validator here. The callback receives validated
`data`; the public invocation wraps it in `{ data }`. A helper without a validator
has no caller-data argument. Keep runtime boundary checks appropriate to the
actual untrusted input; a TypeScript annotation alone does not validate JSON.

## Coordinate multiple steps

```ts
const changeAndUnconfirm = form.stepSchema.createHelperFn({
  stepData: ['step1', 'step2'],
}, ({ update }) => {
  update.step1({ fields: ['fields.quantity.defaultValue'], updater: 2 });
  update.step2({ fields: ['fields.accepted.defaultValue'], updater: false });
});

changeAndUnconfirm();
```

`stepData` limits available context and named utilities. It accepts `'all'`,
tuple, or object selectors. Multiple update calls are separate operations; the
helper groups domain behavior but does not promise an atomic transaction.

`ctxData` can project additional context from selected data for a general helper.
Keep it derived from the invocation's current context rather than capturing a
stale answer at helper creation. Do not call React hooks from a core helper.

## Choose factory helpers deliberately

Factory step helpers, such as `createForm.step1.createHelperFn`, dispatch through
the active instance. Factory calls select an instance; `setActiveInstance` and
`getActiveInstanceName` make that selection explicit. No selected instance produces
`NoActiveInstanceError`. Prefer bound helpers when multiple workflows coexist.

## Next steps

- [Select context](step-selection.md)
- [Reusable action factories](action-factories.md)
- [Compose callable APIs](composition.md)
