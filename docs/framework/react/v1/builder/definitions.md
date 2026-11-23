---
title: Definitions and runtime compilation
description: Build a JSON form definition and turn it into a runtime form or typed TypeScript modules.
order: 30
---

The builder core edits serializable form definitions without depending on a UI
framework. Use it for a custom editor or to construct forms programmatically.

In this guide you will:

- Build a definition with typed commands.
- Edit fields and undo changes.
- Choose runtime compilation or source generation.

## Build a definition

```ts
import { createDefinitionBuilder } from '@jfdevelops/multi-step-form-builder-core';

const definition = createDefinitionBuilder()
  .step({ title: 'Contact' }, (step) => {
    step
      .field({ type: 'text', key: 'name', isRequired: true })
      .field({ type: 'string.email', key: 'email' });
  })
  .step({ title: 'Workshop' }, (step) => {
    step.field({ type: 'number', key: 'attendees', defaultValue: 12 });
  })
  .build();
```

Each step callback scopes fields to that step. The result is a `FormDefinition`
containing steps, fields, settings, and schema descriptions. A field's schema
describes its value; its input type describes its presentation.

## Understand the saved document

| Part | Meaning |
| --- | --- |
| `schemaVersion` | Definition document format version |
| `id` | Stable form identity used by storage |
| `revision` | Save revision used for concurrency |
| `meta` | Optional title and description for the designed form |
| `settings` | Runtime defaults, instance names, and validation choice |
| `steps` | Ordered editor steps, each with fields in display order |

The definition contains JSON data. The builder snapshot additionally contains
selection, history availability, issues, registry, and save status. Use
`builder.toJSON()` for the saved artifact; do not serialize the whole snapshot.
JSON does not include registry callbacks or code-owned validation implementations.

## Edit a definition

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder({ initial: definition });
const stepId = builder.getSnapshot().activeStepId;

if (stepId) {
  builder.fields.add({ type: 'text', key: 'organization', stepId });
  builder.history.undo();
  builder.history.redo();
}

const edited = builder.toJSON();
```

Steps and fields have stable editor IDs. Generated step keys follow their order
(`step1`, `step2`, and so on), so use IDs for editor commands rather than those
generated keys. Subscribe with `builder.subscribe(listener)` and read
`builder.getSnapshot()` to connect your own UI.

## Run a definition

```ts
import { createFormFromDefinition } from '@jfdevelops/multi-step-form-builder-core';

const createForm = createFormFromDefinition(edited);
const form = createForm();
```

Runtime definitions have fields known at runtime. For application code that
needs inference for individual field names and values, generate source instead.
When using a custom registry or validator adapter, pass the same registry to
editing, compilation, and generation.

## Generate application source

```ts
import { generateCode } from '@jfdevelops/multi-step-form-builder-core';

const generated = generateCode(edited, {
  importFrom: '@jfdevelops/multi-step-form-core',
});

for (const file of generated.files) {
  console.log(file.path, file.source);
}
```

Write each returned file to its relative path in your application. `files`
contains `form.ts` and per-step modules under `steps/`. Install the packages
listed in `generated.packages`. Generation returns content; it does not write
files or install dependencies.

The default import target is `@jfdevelops/react-multi-step-form`; the example
selects the framework-independent runtime explicitly. `source` is also available
as a standalone module, and `validatorsSource` contains the validators alone.

## Next steps

- [Choose a builder validator](validation.md)
- [Save builder definitions](persistence.md)
- [Build a React editor](quick-start.md)
- [Explore source export options](code-generation.md)
