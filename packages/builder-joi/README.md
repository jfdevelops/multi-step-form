# `@jfdevelops/multi-step-form-builder-joi`

Lets form builder authors validate steps with [Joi](https://joi.dev) v18. Each step's schema,
edited in the builder, compiles with Joi at runtime, and the generated code
contains the same Joi code.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-joi joi
```

## Usage

```ts
import { createFormBuilder, createRegistry } from '@jfdevelops/multi-step-form-builder-core';
import { joiAdapter } from '@jfdevelops/multi-step-form-builder-joi';

const registry = createRegistry({ validators: [joiAdapter] });
const builder = createFormBuilder({ registry });

// Every step, unless a step picks its own library…
builder.settings.update({ validator: 'joi' });
// …or just one step.
builder.validation.set(builder.getSnapshot().activeStepId!, { kind: 'schema', library: 'joi' });
```

Use the same registry with `createFormFromDefinition` and `generateCode`.

Values are validated without type conversion (`convert: false`), reporting every issue (`abortEarly: false`). The adapter runs the same conformance suite as every other adapter, so a step behaves
the same whichever library compiles it: the same fields fail, with the builder's messages.

The schema description is exported as `joiSchemaBuilder`, made with `createSchemaBuilder` from
the core package, if you want to build on it.
