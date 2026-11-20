---
title: Choose a builder validator
description: Register a schema adapter and select validation for an entire form or an individual step.
order: 20
---

Builder adapters compile the same schema description into runtime validation and
generated application code. Select a library already used by your application
or use the built-in validator without an additional dependency.

In this guide you will:

- Install a validator adapter.
- Register it with the builder.
- Select validation per form or per step.

## Choose an adapter

| Adapter package suffix | Library peer | Export |
| --- | --- | --- |
| `builder-zod` | Zod 4 | `zodAdapter` |
| `builder-valibot` | Valibot 1 | `valibotAdapter` |
| `builder-arktype` | ArkType 2 | `arktypeAdapter` |
| `builder-effect` | Effect 4 | `effectAdapter` |
| `builder-yup` | Yup 1 | `yupAdapter` |
| `builder-joi` | Joi 18 | `joiAdapter` |

Each package starts with `@jfdevelops/multi-step-form-`. For example:

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-zod zod
```

## Register the adapter

```ts
import {
  createFormBuilder,
  createRegistry,
  generateCode,
} from '@jfdevelops/multi-step-form-builder-core';
import { zodAdapter } from '@jfdevelops/multi-step-form-builder-zod';

const registry = createRegistry({ validators: [zodAdapter] });
const builder = createFormBuilder({ registry });

builder.fields.add({ type: 'string.email', key: 'email', isRequired: true });
builder.settings.update({ validator: 'zod' });

const generated = generateCode(builder.toJSON(), { registry });
```

Keep this registry available wherever the definition is loaded, previewed,
compiled, or exported. A saved definition identifies its library but does not
bundle the adapter implementation.

## Select validation for a step

```ts
const stepId = builder.getSnapshot().activeStepId;

if (stepId) {
  builder.validation.set(stepId, { kind: 'schema', library: 'zod' });
}
```

The form setting supplies the default library; a step can select its own.
Builder-managed schemas determine completeness through validation. Adapters must
validate synchronously because completeness is computed synchronously. The Yup
adapter supplies a synchronous wrapper rather than using Yup's asynchronous
Standard Schema path.

## Preserve inferred types when exporting

Zod, Valibot, ArkType, and Effect adapters support validator input inference in
generated modules. Their defaults use indexed field types from an inferred
step-values alias. Built-in, Yup, Joi, and custom adapters without that capability
use explicit fallback value types.

## Next steps

- [Create and export definitions](definitions.md)
- [Build a React editor](../../../react/v1/guides/form-builder.md)
