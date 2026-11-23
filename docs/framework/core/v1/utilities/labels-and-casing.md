---
title: Labels and casing
description: Generate consistent field labels, validate casing choices, and transform names for custom interfaces.
order: 50
---

Label helpers let a custom renderer follow the runtime's naming behavior. Use
them when your interface works with raw field definitions instead of resolved fields.

In this guide you will:

- Generate or suppress labels.
- Validate a casing option.
- Transform names without changing answer keys.

## Generate a field label

```ts
import { createFieldLabel } from '@jfdevelops/multi-step-form-core';

const derived = createFieldLabel(undefined, 'firstName', 'title', true);
const explicit = createFieldLabel('Your name', 'firstName', 'title', true);
const hidden = createFieldLabel(false, 'firstName', 'title');
```

The results are `First Name*`, `Your name`, and `undefined`. A required marker
is appended to a derived label. An explicit label remains unchanged, and `false`
suppresses the label. Resolved runtime fields already contain this result; do
not regenerate it unless working at a lower level.

## Transform display names

```ts
import { changeCasing, CASING_TYPES, DEFAULT_CASING } from '@jfdevelops/multi-step-form-core';

const title = changeCasing('postal_code', 'title');
const key = changeCasing('Postal code', 'camel');
```

These return `Postal Code` and `postalCode`. Supported casing names are
`sentence`, `title`, `camel`, `lower`, `upper`, `pascal`, `snake`,
`screaming-snake`, `flat`, and `kebab`. `CASING_TYPES` provides the choices, and
`DEFAULT_CASING` is `title`.

Changing a display label does not rename a form field. If using a transformed
string as a new field key, validate it for the target format and handle collisions.
The builder provides `toKey`, `isValidKey`, and `uniqueKey` for that authoring task.

## Validate configuration before applying it

```ts
import { isCasingValid, setCasingType } from '@jfdevelops/multi-step-form-core';

const candidate: unknown = 'snake';
const casing = isCasingValid(candidate) ? candidate : DEFAULT_CASING;
const fallback = setCasingType(undefined, 'sentence');
```

`isCasingValid` narrows unknown values. `setCasingType` resolves an optional
configuration to a valid fallback, using `DEFAULT_CASING` when none is supplied.

`quote(text, quoteChar)` wraps text in matching single or double quotes and
retains already matching outer quotes. It is a formatting helper, not a string
escaping or code-injection prevention utility. For generated literals, use the
builder's source-generation helpers instead.

## Next steps

- [Field value helpers](values-and-paths.md)
- [Builder naming utilities](../../../react/v1/builder/utilities/definition-utilities.md)
- [Type-level casing](type-utilities.md)
