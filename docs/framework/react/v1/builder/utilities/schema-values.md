---
title: Schema traversal and value conversion
description: Inspect and update schema trees, fit defaults, and convert between JSON, runtime dates, and TypeScript source.
order: 20
---

Schema helpers are pure building blocks for custom schema and default-value
editors. They understand nested objects, arrays, records, unions, and dates.

In this guide you will:

- Traverse and update a nested schema.
- Distinguish shape matching from validation.
- Convert defaults between JSON and runtime values.
- Display a schema's type and emitted default source.

## Traverse a schema tree

```ts
import {
  createSchemaNode, getSchemaAt, updateSchemaAt, walkSchema, ITEM_SEGMENT,
  type SchemaNode,
} from '@jfdevelops/multi-step-form-builder-core';

const root: SchemaNode = { kind: 'array', item: { kind: 'string' } };
const item = getSchemaAt(root, [ITEM_SEGMENT]);
const next = updateSchemaAt(root, [ITEM_SEGMENT], () => createSchemaNode('number'));
const visited: string[] = [];
walkSchema(next, (node, path) => visited.push(`${path.join('.')}: ${node.kind}`));
```

`getSchemaAt` returns `undefined` for an absent path. `updateSchemaAt` returns a
new tree; it leaves the tree unchanged when the path cannot be followed.
`walkSchema` visits the root and descendants depth first.

Paths use object property names, `ITEM_SEGMENT` (`#item`), `VALUE_SEGMENT`
(`#value`), and `optionSegment(index)` for union branches. These are schema
paths, not paths into an answer array's individual elements.

`createSchemaNode(kind, previous)` preserves supported modifiers and compatible
checks when changing a kind. Use `SCHEMA_KINDS` and `CHECKS_BY_KIND` to populate
the editor's type and check choices.

## Fit a value to a changed shape

```ts
import { inferSchema, matchesSchema, coerceValue, getEmptyValue } from '@jfdevelops/multi-step-form-builder-core';

const inferred = inferSchema({ name: '', count: 1 });
const fits = matchesSchema(next, [1, 2]);
const fitted = coerceValue(next, ['old text', 2]);
const empty = getEmptyValue(next);
```

`matchesSchema` tests shape, not checks such as minimum length or email validity.
`coerceValue` fits incompatible entries to schema defaults; it is not a parser
that promises to turn numeric text into numbers. Here `['old text', 2]` becomes
`[0, 2]`. `getEmptyValue` returns a shape-appropriate JSON value.

`inferSchema` describes an existing value, using the first array item to infer
its item schema and `unknown` for an empty array. It cannot infer optionality,
business constraints, or every branch of a heterogeneous array.

## Convert dates at the boundary

```ts
import { toRuntimeValue, toJsonValue } from '@jfdevelops/multi-step-form-builder-core';

const dateSchema: SchemaNode = { kind: 'date' };
const runtimeDate = toRuntimeValue(dateSchema, '2030-01-15T00:00:00.000Z');
const serializedDate = toJsonValue(runtimeDate);
```

`toRuntimeValue` converts date nodes, including nested ones, into `Date` values.
`toJsonValue` converts runtime dates to ISO strings and traverses plain objects
and arrays. Unsupported function/symbol/undefined values are not preserved as
executable code. This conversion is not a complete validator for arbitrary
external objects.

## Display types and defaults as source

```ts
import { toTypeScript, toValueSource, needsTypeAnnotation, formatPropertyKey } from '@jfdevelops/multi-step-form-builder-core';

const typeText = toTypeScript(dateSchema);
const valueText = toValueSource(dateSchema, '2030-01-15T00:00:00.000Z');
const annotate = needsTypeAnnotation({ kind: 'array', item: { kind: 'string' } });
const propertyText = formatPropertyKey('delivery address');
```

`toTypeScript` describes the value type. `toValueSource` emits an initializer,
including `new Date(...)` for date nodes. `needsTypeAnnotation` identifies shapes
whose intended type is not captured by ordinary value inference.
`formatPropertyKey` quotes keys that are not valid plain identifier text.

To apply an edit to a live builder, use `fields.updateSchema` or
`createSchemaEditorActions`, which record history and fit defaults. A pure
`updateSchemaAt` call alone does not notify or update the builder.

## Next steps

- [Schema editor actions](editor-models.md)
- [Compile actual validation](validator-utilities.md)
- [Source expressions](expressions-and-imports.md)
