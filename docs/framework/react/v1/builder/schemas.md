---
title: Schemas and default values
description: Model nested values, add validation checks, and keep defaults compatible with the designed schema.
order: 60
---

A schema describes a field's value independently of its input presentation.
The same tree drives default-value editing, runtime validation, and generated
TypeScript types.

In this guide you will:

- Choose value shapes.
- Add checks and nested properties.
- Update a schema through builder commands.
- Handle default-value changes after schema edits.

## Choose a value shape

| Kind | Value | Child shape |
| --- | --- | --- |
| `string`, `number`, `boolean`, `date` | Scalar value | None |
| `literal` | One fixed string, number, or boolean | `value` |
| `enum` | One of the listed strings or numbers | `values` |
| `object` | Named properties | `properties: [{ key, schema }]` |
| `array` | Repeated items | `item` |
| `record` | Dictionary with arbitrary keys | `value` schema |
| `union` | One of several allowed shapes | `options` |
| `unknown` | Unconstrained value | None |

Definitions are JSON-safe. Date defaults use ISO strings and are converted to
runtime dates when compiled. Do not place `Date` instances or callbacks in saved
definitions.

## Build a nested schema

```ts
import type { SchemaNode } from '@jfdevelops/multi-step-form-builder-core';

const attendeeSchema: SchemaNode = {
  kind: 'object',
  properties: [
    { key: 'name', schema: { kind: 'string', checks: [{ check: 'minLength', value: 1 }] } },
    { key: 'age', schema: { kind: 'number', optional: true, checks: [{ check: 'min', value: 0 }] } },
  ],
};
```

`optional` permits omission of an object property. `nullable` permits `null`.
At a field's root, requiredness follows the field's `isRequired` setting rather
than treating root `optional` as the form's required toggle.

## Apply a schema edit

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder();
const quantityId = builder.fields.add({ type: 'number', key: 'quantity', defaultValue: 1 });

builder.fields.updateSchema(quantityId, [], () => ({
  kind: 'number',
  checks: [{ check: 'integer' }, { check: 'min', value: 1 }],
}));
```

An empty path selects the root. For nested changes, schema paths use property
names, `#item` for an array item, `#value` for a record value, and `#0`, `#1`, and
so on for union options. These are schema paths, not runtime answer paths.

The command fits the default to the new shape while preserving compatible data.
Review the fitted default after changing kinds, removing properties, or changing
enum options so the author understands any data adjustment.

## Choose compatible checks

| Value shape | Useful checks |
| --- | --- |
| String | `minLength`, `maxLength`, `length`, `email`, `url`, `uuid`, `pattern` |
| Number | `min`, `max`, `integer` |
| Date | `min`, `max` |
| Array | `minLength`, `maxLength`, `length` |
| Supported scalar field root | `equalsField` referencing a field in the same step |

Use `CHECKS_BY_KIND` to populate a schema editor's available checks rather than
offering every check on every kind. `equalsField` is limited to the field root
and must point to an existing field key. Add a custom `message` on a check when
its default wording does not explain the author's rule.

## Connect a React schema editor

`useSchemaEditor(fieldId)` exposes the tree and edit actions for a field. Without
an ID, it targets the single selected field and returns `undefined` for other
selection shapes. Render an instruction to select one field in that case.

Schema editing is separate from choosing the control type: an object schema
needs a value editor capable of handling objects, even if your palette uses one
card to represent that field.

## Next steps

- [Choose a validator](validation.md)
- [Register custom field types](custom-fields.md)
- [Preview values](preview.md)
