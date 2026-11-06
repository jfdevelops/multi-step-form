# `@jfdevelops/multi-step-form-builder-zod`

Lets form builder authors validate steps with [Zod](https://zod.dev) v4. Each step's schema,
edited in the builder, compiles with Zod at runtime, and the generated code
contains the same Zod code.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-zod zod
```

## Usage

```ts
import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';

const registry = createRegistry({ validators: [zodAdapter] });
const builder = createFormBuilder({ registry });

// Every step, unless a step picks its own library…
builder.settings.update({ validator: 'zod' });
// …or just one step.
builder.validation.set(builder.getSnapshot().activeStepId!, { kind: 'schema', library: 'zod' });
```

Use the same registry with `createFormFromDefinition` and `generateCode`.

Steps compile to `z.object(…)`, and zod schemas are Standard Schemas. The adapter runs the same conformance suite as every other adapter, so a step behaves
the same whichever library compiles it: the same fields fail, with the builder's messages.

The schema description is exported as `zodSchemaBuilder`, made with `createSchemaBuilder` from
the core package, if you want to build on it.
