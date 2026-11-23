---
title: Expressions and source imports
description: Record runtime expressions as source code and emit consistent helpers, checks, and import bindings.
order: 60
---

Expression utilities keep an adapter's runtime values and emitted code paired.
Use them when a validator library needs callbacks or helper declarations that
ordinary JSON cannot represent.

In this guide you will:

- Pair a runtime callback with source text.
- Record shared declarations and check predicates.
- Emit named, default, and namespace imports.
- Keep generated values separate from executable strings.

## Pair a value with its source

```ts
import { createExpr, isExpr, printExpr, unwrapExpr } from '@jfdevelops/multi-step-form-builder-core';

const positive = createExpr((value: number) => value > 0, '(value: number) => value > 0');
const wrapped = isExpr(positive);
const source = printExpr(positive);
const runtime = unwrapExpr(positive);
const allowed = runtime(3);
```

Expressions are typed like their runtime values. Library property access and
calls can record code while operating on the underlying library through the
expression machinery. `unwrapExpr` recovers runtime values, including expressions
inside plain objects and arrays. `printExpr` emits expression code or literal
data; a plain function cannot be printed without an explicit source pairing.

The source string is code authored by the adapter developer. It does not execute
merely because `printExpr` returns it, and it is not reconstructed from arbitrary
function closures. Ensure its free variables have matching emitted imports or
declarations.

## Record shared helpers

```ts
import { createCodegen } from '@jfdevelops/multi-step-form-builder-core';

const codegen = createCodegen();
const check = { check: 'min' as const, value: 1 };
const predicate = codegen.predicate(check, { kind: 'number' });
const message = codegen.message(check);
const passes = predicate.test(2);
const predicateSource = predicate.code;
```

`predicate` returns a runtime test and an expression over a variable named
`value`. `message` uses explicit check copy or its default. `pattern` compiles a
pattern check; `email`, `uuid`, and `isUrl` record shared helpers when used.

`declare(name, runtime, code)` records a top-level constant once by name and
returns its expression. `declarations()` returns recorded source statements.
`fn(runtime, code)` pairs a callback without adding a named declaration. Create
one codegen context per build and avoid reusing a declaration name for different
implementations.

## Emit import bindings

```ts
import { createImportBinding, createImportStatement } from '@jfdevelops/multi-step-form-builder-core';

const binding = createImportBinding('namespace', 'validation');
const statement = createImportStatement({
  kind: 'namespace', name: 'validation', from: 'validation-library',
});
```

Supported `IMPORT_BINDING_KINDS` are `named`, `namespace`, and `default`.
An omitted kind defaults to named. Invalid kinds from untyped callers throw
`InvalidImportBindingError` with binding context.

These helpers format declared import metadata; they do not resolve packages,
install dependencies, or rename conflicting local symbols for your application.
Keep `packages` and emitted imports aligned when implementing an adapter.

## Next steps

- [Adapter development](adapter-development.md)
- [Type and value source](schema-values.md#display-types-and-defaults-as-source)
- [Export modules](../code-generation.md)
