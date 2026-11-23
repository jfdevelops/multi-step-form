---
title: Custom fields and registries
description: Add a domain-specific field type with defaults, schema rules, and inspector properties.
order: 70
---

A registry defines what an editor can author. Add a custom field when your
application needs a domain control, such as a rating, that deserves its own
palette entry and property controls.

In this guide you will:

- Register a rating field.
- Describe its schema and inspector settings.
- Reuse the registry throughout the authoring pipeline.
- Supply rendering for the new control.

## Register a rating type

```ts
import {
  createFormBuilder,
  createRegistry,
  prop,
  section,
} from '@jfdevelops/multi-step-form-builder-core';

const registry = createRegistry({
  fieldTypes: [{
    id: 'rating',
    label: 'Rating',
    category: 'Feedback',
    keywords: ['stars', 'score'],
    inputTypes: [{ type: 'number.rating', label: 'Stars' }],
    schema: {
      kind: 'number',
      checks: [{ check: 'integer' }, { check: 'min', value: 1 }, { check: 'max', value: 5 }],
    },
    defaultValue: 3,
    defaults: { props: { caption: 'Choose a score from 1 to 5' } },
    inspector: [section('Rating', [
      prop.text('props.caption', { label: 'Caption' }),
    ])],
  }],
});

const builder = createFormBuilder({ registry });
builder.fields.add({ type: 'rating', key: 'satisfaction' });
```

`id` identifies the palette type. `inputTypes` supplies presentation variants
written onto fields. The schema and default establish the value contract.
`defaults.props` carries custom JSON metadata, and inspector descriptors explain
how the editor can change that metadata.

The built-in types remain available unless you set `builtins: false`. The
built-in validator adapter is included independently of that field-type option.

## Keep metadata and behavior aligned

Changing `props.caption` changes copy, not validation. If you offer an editable
maximum score, your application must coordinate the control's maximum, schema's
maximum check, and current default. A descriptor alone does not create that
dependency.

Use schema/default factory functions when constructing a fresh value requires
logic. Functions belong to the registry in application code; saved definitions
contain the resulting JSON values, not those functions.

## Reuse the same registry

```ts
import { generateCode } from '@jfdevelops/multi-step-form-builder-core';

const generated = generateCode(builder.toJSON(), { registry });
```

Pass `registry` to `useFormBuilder({ registry })` for the React editor, and to
compilation and generation outside that provider. Loading a saved definition
does not recreate its registry. Unknown custom input types appear as definition
issues when the matching registration is missing.

Registries are immutable. `registry.withFieldType(...)` and
`registry.withValidator(...)` return new registries; retain the returned value
when constructing another editor or compilation environment.

## Render the control in each surface

| Surface | Your responsibility |
| --- | --- |
| Palette | Display label, category, optional icon, and search results |
| Canvas | Show a useful representation of the designed field |
| Inspector | Render descriptors, including custom control kinds |
| Preview | Render `number.rating` as a numeric rating control |
| Consuming application | Map the generated field metadata to the runtime control |

Registration does not ship a React rating component. Code generation preserves
the definition's types and metadata; your renderer decides how that becomes UI.
Offer a useful unsupported-type message instead of silently rendering an
incompatible text input.

## Next steps

- [Edit schema rules](schemas.md)
- [Build property controls](inspector.md)
- [Generate application code](code-generation.md)
