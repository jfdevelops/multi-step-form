# `@jfdevelops/multi-step-form-builder-yup`

Lets form builder authors validate steps with [Yup](https://github.com/jquense/yup) v1. Each step's schema,
edited in the builder, compiles with Yup at runtime, and the generated code
contains the same Yup code.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-yup yup
```

## Usage

```ts
import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { yupAdapter } from '@jfdevelops/multi-step-form-builder-yup';

const registry = createRegistry({ validators: [yupAdapter] });
const builder = createFormBuilder({ registry });

// Every step, unless a step picks its own library…
builder.settings.update({ validator: 'yup' });
// …or just one step.
builder.validation.set(builder.getSnapshot().activeStepId!, { kind: 'schema', library: 'yup' });
```

Use the same registry with `createFormFromDefinition` and `generateCode`.

Yup’s own Standard Schema is asynchronous, so steps are wrapped in a synchronous one (`toStandardSchema`, also exported) that validates in strict mode. The adapter runs the same conformance suite as every other adapter, so a step behaves
the same whichever library compiles it: the same fields fail, with the builder's messages.

The schema description is exported as `yupSchemaBuilder`, made with `createSchemaBuilder` from
the core package, if you want to build on it.
