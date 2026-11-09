# `@jfdevelops/multi-step-form-builder-arktype`

Lets form builder authors validate steps with [ArkType](https://arktype.io) v2. Each step's schema,
edited in the builder, compiles with ArkType at runtime, and the generated code
contains the same ArkType code.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-arktype arktype
```

## Usage

```ts
import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { arktypeAdapter } from '@jfdevelops/multi-step-form-builder-arktype';

const registry = createRegistry({ validators: [arktypeAdapter] });
const builder = createFormBuilder({ registry });

// Every step, unless a step picks its own library…
builder.settings.update({ validator: 'arktype' });
// …or just one step.
builder.validation.set(builder.getSnapshot().activeStepId!, { kind: 'schema', library: 'arktype' });
```

Use the same registry with `createFormFromDefinition` and `generateCode`.

Checks use `narrow` so the builder’s messages are kept. ArkType reports the first failing check of each value. The adapter runs the same conformance suite as every other adapter, so a step behaves
the same whichever library compiles it: the same fields fail, with the builder's messages.

The schema description is exported as `arktypeSchemaBuilder`, made with `createSchemaBuilder` from
the core package, if you want to build on it.
