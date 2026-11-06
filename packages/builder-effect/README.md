# `@jfdevelops/multi-step-form-builder-effect`

Lets form builder authors validate steps with [Effect Schema](https://effect.website/docs/schema/introduction) v4. Each step's schema,
edited in the builder, compiles with Effect Schema at runtime, and the generated code
contains the same Effect Schema code.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-effect effect
```

## Usage

```ts
import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { effectAdapter } from '@jfdevelops/multi-step-form-builder-effect';

const registry = createRegistry({ validators: [effectAdapter] });
const builder = createFormBuilder({ registry });

// Every step, unless a step picks its own library…
builder.settings.update({ validator: 'effect' });
// …or just one step.
builder.validation.set(builder.getSnapshot().activeStepId!, { kind: 'schema', library: 'effect' });
```

Use the same registry with `createFormFromDefinition` and `generateCode`.

Checks become filters, and the step schema is wrapped with `Schema.toStandardSchemaV1`. The adapter runs the same conformance suite as every other adapter, so a step behaves
the same whichever library compiles it: the same fields fail, with the builder's messages.

The schema description is exported as `effectSchemaBuilder`, made with `createSchemaBuilder` from
the core package, if you want to build on it.
