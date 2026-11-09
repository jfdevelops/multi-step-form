# `@jfdevelops/multi-step-form-builder-valibot`

Lets form builder authors validate steps with [Valibot](https://valibot.dev) v1. Each step's schema,
edited in the builder, compiles with Valibot at runtime, and the generated code
contains the same Valibot code.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-valibot valibot
```

## Usage

```ts
import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { valibotAdapter } from '@jfdevelops/multi-step-form-builder-valibot';

const registry = createRegistry({ validators: [valibotAdapter] });
const builder = createFormBuilder({ registry });

// Every step, unless a step picks its own library…
builder.settings.update({ validator: 'valibot' });
// …or just one step.
builder.validation.set(builder.getSnapshot().activeStepId!, { kind: 'schema', library: 'valibot' });
```

Use the same registry with `createFormFromDefinition` and `generateCode`.

Checks become pipe actions (`v.pipe(v.string(), v.minLength(…))`). The adapter runs the same conformance suite as every other adapter, so a step behaves
the same whichever library compiles it: the same fields fail, with the builder's messages.

The schema description is exported as `valibotSchemaBuilder`, made with `createSchemaBuilder` from
the core package, if you want to build on it.
