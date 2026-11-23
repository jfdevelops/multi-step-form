---
title: Form settings
description: Configure label inheritance, runtime storage, named instances, and validation defaults from the editor.
order: 130
---

Form settings describe how the designed form should run. They are saved inside
the definition and are separate from editor options such as history limits,
autosave, and drag rules.

In this guide you will:

- Set form-wide defaults.
- Understand label and validation inheritance.
- Configure runtime instances and answer storage.
- Keep editor configuration separate.

## Set defaults with core commands

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder();
builder.settings.update({
  nameTransformCasing: 'title',
  validator: 'builtin',
  storageKey: 'registration-answers',
  instances: ['client', 'admin'],
});
```

`settings.update` merges a patch. Set a property to `undefined` to remove it and
return to inherited or default behavior. For React property panels,
`useFormSettings()` exposes the settings model and `update` inside `FormBuilder`.

## Understand inheritance

| Setting | Resolution |
| --- | --- |
| Label casing | Field → step → form → default title casing |
| Explicit label | Overrides generated label text |
| `label: false` | Suppresses the generated label |
| Validator | Step schema library → form validator |
| Step validation `none` | Disables validation even when the form selects a library |
| Step validation `code` | Refers to application-owned logic |

Changing casing affects derived labels, not field keys. A required marker is
part of derived label behavior; render explicit labels and required indicators
according to your application's control design.

## Choose runtime persistence deliberately

`storageKey` becomes runtime answer persistence configuration. It is not the
builder storage adapter or the key under which editor drafts are saved.
Likewise, `instances` declares independent runtime copies; it does not create
multiple editors or change preview instances.

The builder's settings expose one runtime storage key. Named runtime instances
therefore need additional application configuration if their persisted answers
must use distinct keys. See [runtime instances and storage](../../../core/v1/guides/instances-and-storage.md).

Preview deliberately ignores `storageKey` and `instances` so testing a design
does not overwrite production drafts.

## Separate editor options from form settings

| Editor configuration | Set through |
| --- | --- |
| Available field and validator types | `createRegistry` |
| History limit and merge window | `createFormBuilder({ history })` |
| Save backend and autosave | `createFormBuilder({ storage, autosave })` |
| Drop restrictions | `createFormBuilder({ canDrop })` |
| Keyboard shortcuts | `FormBuilder`'s `shortcuts` prop |

`useFormBuilder` reads its initialization options once. Update the existing
builder with commands or load another definition instead of expecting changing
the options object on each render to recreate it.

## Next steps

- [Save the editor draft](persistence.md)
- [Select validation](validation.md)
- [Export runtime configuration](code-generation.md)
