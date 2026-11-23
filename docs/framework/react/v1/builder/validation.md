---
title: Choose a builder validator
description: Register a schema adapter and select validation for an entire form or an individual step.
order: 80
---

Builder adapters compile the same schema description into runtime validation and
generated application code. Select a library already used by your application
or use the built-in validator without an additional dependency.

In this guide you will:

- Install a validator adapter.
- Register it with the builder.
- Select validation per form or per step.

## Choose an adapter

For schema-based completion without an additional dependency, select the built-in
adapter explicitly:

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builtinBuilder = createFormBuilder();
builtinBuilder.settings.update({ validator: 'builtin' });
```

An adapter being available does not enable validation by itself. A form with no
default validator and no step-level validation considers its steps complete.
The checks on field schemas become completion rules when schema validation is
selected.

| Adapter package suffix | Library peer | Export |
| --- | --- | --- |
| `builder-zod` | Zod 4 | `zodAdapter` |
| `builder-valibot` | Valibot 1 | `valibotAdapter` |
| `builder-arktype` | ArkType 2 | `arktypeAdapter` |
| `builder-effect` | Effect 4 | `effectAdapter` |
| `builder-yup` | Yup 1 | `yupAdapter` |
| `builder-joi` | Joi 18 | `joiAdapter` |

Each package starts with `@jfdevelops/multi-step-form-`. For example:

```npm
npm i @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-zod zod
```

```pnpm
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-zod zod
```

```yarn
yarn add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-zod zod
```

```bun
bun add @jfdevelops/multi-step-form-builder-core @jfdevelops/multi-step-form-builder-zod zod
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

## Choose a validation mode

| Step configuration | Behavior |
| --- | --- |
| No `validation` | Inherit the form's selected validator, or run without validation |
| `{ kind: 'schema' }` | Compile field schemas with the form's validator selection |
| `{ kind: 'schema', library: 'zod' }` | Use the named registered adapter for this step |
| `{ kind: 'none' }` | Disable validation for this step, including inherited validation |
| `{ kind: 'code', ref: 'contact.validate' }` | Identify logic supplied by application code |

`StepValidation` and `useStepValidation` expose these choices to a React settings
panel. A code-owned rule can be shown in the editor but cannot be edited as a
schema tree. See [code-owned compilation](code-generation.md#handle-code-owned-logic-explicitly)
for restoring that logic at runtime.

## Distinguish definition issues from answer errors

An invalid field key or missing registry adapter is a problem in the designed
form. An email that fails a check is a problem with a test answer. Show definition
issues in the editor and answer errors in preview. Neither replaces server
validation of submitted production answers.

## Next steps

- [Create and export definitions](definitions.md)
- [Build a React editor](quick-start.md)
