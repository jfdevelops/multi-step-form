---
title: Adapter package helpers
description: Use the schema builders exported by validator packages and wrap existing Yup schemas synchronously.
order: 70
---

Validator packages export their schema builders as well as registry-ready
adapters. Use a builder directly when a tool needs both a runtime validator and
the source that creates it.

In this guide you will:

- Choose an adapter or schema-builder export.
- Build a resolved step specification.
- Use the synchronous Yup wrapper appropriately.

## Choose an export

Each package name below starts with `@jfdevelops/multi-step-form-`.

| Package suffix | Registry adapter | Schema builder |
| --- | --- | --- |
| `builder-zod` | `zodAdapter` | `zodSchemaBuilder` |
| `builder-valibot` | `valibotAdapter` | `valibotSchemaBuilder` |
| `builder-arktype` | `arktypeAdapter` | `arktypeSchemaBuilder` |
| `builder-effect` | `effectAdapter` | `effectSchemaBuilder` |
| `builder-yup` | `yupAdapter` | `yupSchemaBuilder` |
| `builder-joi` | `joiAdapter` | `joiSchemaBuilder` |

Install the adapter and its peer library as described in the
[validation guide](../validation.md). Ordinary editor integration registers the
adapter; custom compilation tools can use the schema builder's callable API,
`buildStepSchema`, or `createAdapter`.

## Build one step explicitly

```ts
import { createDefinitionBuilder, createRegistry, resolveStepSchema } from '@jfdevelops/multi-step-form-builder-core';
import { zodAdapter, zodSchemaBuilder } from '@jfdevelops/multi-step-form-builder-zod';

const registry = createRegistry({ validators: [zodAdapter] });
const definition = createDefinitionBuilder({ registry })
  .settings({ validator: 'zod' })
  .step({ title: 'Contact' }, (step) => {
    step.field({ type: 'string.email', key: 'email', isRequired: true });
  })
  .build();

const spec = resolveStepSchema(definition.steps[0]!, definition.settings);

if (spec) {
  const built = zodSchemaBuilder.buildStepSchema(spec);
  const validator = built.schema;
  const source = built.code;
}
```

The result includes `schema`, `imports`, `declarations`, and `code`. The imports
and declarations are part of a usable emitted module; code alone may reference
symbols those statements introduce. Use `generateCode` for a complete form export.

## Wrap a Yup schema synchronously

The Yup package additionally exports `toStandardSchema`. It wraps an existing
Yup schema with synchronous validation, strict checking, aggregated issues, and
converted nested paths. Import it from
`@jfdevelops/multi-step-form-builder-yup`, not builder core.

The wrapper is useful because step completeness must be synchronous. It does not
make asynchronous Yup tests synchronous or permit waiting on remote validation
inside a completion check. Use the package's `yupAdapter` for definitions managed
by the builder, and the wrapper when you already own a Yup schema.

## Next steps

- [Adapter development](adapter-development.md)
- [Resolve validators](validator-utilities.md)
- [Generate modules](../code-generation.md)
