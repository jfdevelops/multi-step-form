---
title: Validator adapter development
description: Implement runtime and emitted validation together and declare schema support and inference capabilities.
order: 50
---

An adapter translates a resolved schema specification into a synchronous
validator and the source code that constructs it. Implement both from one
representation so preview and exported forms follow the same rules.

In this guide you will:

- Build an adapter around shared compilation work.
- Declare packages and supported schema nodes.
- Choose a low-level adapter or schema builder.
- Verify runtime and generated behavior together.

## Wrap a shared build function

This example wraps the built-in compiler under an application-selected library
name to show the adapter contract without introducing another schema library:

```ts
import {
  createValidatorAdapter, createSchemaValidator, createRegistry,
  type ResolvedStepSchema,
} from '@jfdevelops/multi-step-form-builder-core';

const createRegistrationAdapter = createValidatorAdapter((spec: ResolvedStepSchema) => ({
  schema: createSchemaValidator(spec),
  code: `createSchemaValidator(${JSON.stringify(spec)})`,
}));

const registrationAdapter = createRegistrationAdapter({
  library: 'registration',
  label: 'Registration rules',
  packages: ['@jfdevelops/multi-step-form-builder-core'],
  compile: (_spec, built) => built.schema,
  emit: (_spec, built) => ({
    imports: ["import { createSchemaValidator } from '@jfdevelops/multi-step-form-builder-core';"],
    declarations: [],
    code: built.code,
  }),
});

const registry = createRegistry({ validators: [registrationAdapter] });
```

`createValidatorAdapter` caches build work by resolved specification identity.
When compile and emit receive the same spec object, the build callback runs
once. The cache is not a global content hash for equivalent JSON objects.

Select `registration` in form or step settings to use this registered adapter.
The registry holds executable behavior; saving that name alone does not install
the adapter in another process.

## Declare support and dependencies

`packages` lists imports required by emitted code. `supports(node)` returns
`true` or a reason why a schema cannot be expressed. Generic checks already
reject checks on incompatible kinds and unusable patterns before adapter-specific
support is evaluated.

Set `supportsTypeInference` only when emitted validators preserve concrete input
types that generation can use. A broadly typed generic validator should use the
fallback explicit value types. Do not claim inference because runtime validation
alone succeeds.

## Choose a schema builder for another library

`createSchemaBuilder` describes how a library represents every schema kind,
object entries, optional and nullable values, cross-field refinements, and its
synchronous Standard Schema boundary. It returns a callable with
`buildStepSchema` and `createAdapter` helpers.

| Builder part | Responsibility |
| --- | --- |
| `module`, `import` | Runtime library module and generated import binding |
| `kinds` | Construct non-object schemas, including their checks |
| `object` | Combine built properties into an object or step schema |
| `checks` | Optional common processing after kind construction |
| `nullable`, `optional` | Apply value modifiers |
| `refine` | Apply same-step equality rules with field paths |
| `standard` | Return a synchronous Standard Schema validator |

The context exposes `chain` for method-style checks, `actions` for pipeline-style
checks, `field` for nested schemas, `lib` for the wrapped library module,
`bound` for numeric/date bounds, and shared code-generation tools. Unhandled
checks in a handler map are skipped; implement them or reject the corresponding
nodes through support rules rather than silently losing validation.

Use the [expression utilities](expressions-and-imports.md) for callback or helper
code that must both execute and be emitted. The types `SchemaBuilderContext`,
`SchemaKindBuilders`, `ObjectEntry`, `BuiltStepSchema`, `ValidatorAdapter`, and
`EmittedValidator` describe these extension boundaries.

## Verify the contract

Exercise required and optional values, nullable values, every supported kind,
nested dates, arrays, enum choices, and cross-field errors. Compile emitted
modules as consumer code and run equivalent valid/invalid inputs against both
runtime and exported validators. Confirm issue paths still identify the field
that should display the message.

## Next steps

- [Expression and import helpers](expressions-and-imports.md)
- [Resolve specifications](validator-utilities.md)
- [Register validators](../validation.md)
