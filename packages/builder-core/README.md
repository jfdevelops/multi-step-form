# `@jfdevelops/multi-step-form-builder-core`

The framework-agnostic engine for building a drag-and-drop multi-step form builder. It owns the
form being edited, the commands a builder UI calls, undo/redo, selection, clipboard, drop rules,
a schema builder for every field, and conversion to and from `defineMultiStepForm`. It has no DOM
or framework dependency: pair it with
[`@jfdevelops/react-multi-step-form-builder`](../builder-react/README.md) or your own bindings.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core
```

## The definition

A builder edits a `FormDefinition`: plain JSON you can store, send, diff and load back.

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder();
const stepId = builder.getSnapshot().activeStepId!;

builder.steps.update(stepId, { title: 'Contact' });
const emailId = builder.fields.add({ type: 'string.email', key: 'emailAddress', isRequired: true });

builder.history.undo();
const definition = builder.toJSON();
```

- **Steps** are named by position (`step1`, `step2`, …), like a multi-step form does, so a step is
  renumbered when it moves. Steps keep a stable `id` inside the builder.
- **Labels** come from field keys, resolved with the multi-step form's own `createFieldLabel` and
  `nameTransformCasing` (`emailAddress` → `Email Address*` when required). Casing can be set on
  the form, a step or a field.
- **Form settings** (`builder.settings.update`) hold the default validator library, label casing,
  storage key and named instances: everything `defineMultiStepForm` and `configure` accept.

## Fluent definitions

Use the definition builder when constructing a form in code. Fields are scoped to their step;
registry defaults, input checks, and unique field keys work just as they do in the editor.

```ts
import { createDefinitionBuilder } from '@jfdevelops/multi-step-form-builder-core';

const sampleDefinition = createDefinitionBuilder()
  .settings({ validator: 'builtin', instances: ['organizer', 'reviewer'] })
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

For interactive edits, `builder.fields.add` takes one object containing `type`, field settings,
and optional `stepId` and `index`. Omitting the position appends to the active step:

```ts
builder.fields.add({ type: 'text', key: 'name', stepId, index: 0 });
```

## Field types and input types

The palette has one entry per kind of value: **Text**, **Number**, **Checkbox**, **Date**,
**Choice**, **Multiple choice**, **Group** (an object) and **List**. How a field is rendered is its
input type, picked in the inspector: a text field can be text, long text, email, URL, phone or
password. Input types can add checks (email adds `email`).

```ts
import { createRegistry, prop, section } from '@jfdevelops/multi-step-form-builder-core';

const registry = createRegistry().withFieldType({
  id: 'rating',
  label: 'Rating',
  inputTypes: [{ type: 'number.rating', label: 'Stars' }],
  schema: { kind: 'number', checks: [{ check: 'min', value: 1 }, { check: 'max', value: 5 }] },
  defaultValue: 3,
  inspector: [section('Rating', [prop.number('props.max', { label: 'Stars', min: 1 })])],
});
```

## The schema tree

Every field has a `schema`: a library-agnostic description of its value, as deep as needed.

| Kind | Describes |
| --- | --- |
| `string`, `number`, `boolean`, `date` | Primitive values |
| `literal`, `enum` | One exact value, or one of a list |
| `object`, `array`, `record` | Nested properties, lists, and dictionaries |
| `union`, `unknown` | Any of several shapes, or anything |

Any node can be `optional` or `nullable`, and carries checks (`minLength`, `min`, `email`,
`pattern`, `equalsField`, …). The schema decides three things:

1. The **default value**: `builder.fields.updateSchema(id, path, update)` fits the value to the new
   shape, keeping whatever still fits.
2. The **TypeScript type** of the value in generated code (`toTypeScript`).
3. The **validator**: each step compiles its fields' schemas with a Standard Schema library.

`getSchemaEditorModel` and `createSchemaEditorActions` drive a schema editor UI.

## Validator libraries

A step is validated with the form's default library, its own library, or not at all
(`builder.validation.set`). Completeness follows validation, so no `isComplete` is needed.
`builtin` has no dependencies; every other library is a separate package:

| Package | Library |
| --- | --- |
| [`@jfdevelops/multi-step-form-builder-zod`](../builder-zod/README.md) | Zod 4 |
| [`@jfdevelops/multi-step-form-builder-valibot`](../builder-valibot/README.md) | Valibot 1 |
| [`@jfdevelops/multi-step-form-builder-arktype`](../builder-arktype/README.md) | ArkType 2 |
| [`@jfdevelops/multi-step-form-builder-effect`](../builder-effect/README.md) | Effect Schema 4 |
| [`@jfdevelops/multi-step-form-builder-yup`](../builder-yup/README.md) | Yup 1 |
| [`@jfdevelops/multi-step-form-builder-joi`](../builder-joi/README.md) | Joi 18 |

### Writing an adapter

`createSchemaBuilder` describes how a library expresses the schema tree, one function per kind.
Calls on `ctx.lib` run the real library and record the same calls as source code, so the runtime
validator and the exported code can't drift apart. `createAdapter` turns the builder into an
adapter; the build runs once per step and the runtime validator and the generated code share it.

```ts
import { createSchemaBuilder } from '@jfdevelops/multi-step-form-builder-core';
import { z } from 'zod';

export const zodSchemaBuilder = createSchemaBuilder({
  module: z,
  import: { name: 'z', from: 'zod' },
  kinds: {
    string: (node, ctx) =>
      ctx.chain(node, ctx.lib.string(node.message), {
        minLength: (schema, check, message) => schema.min(check.value, message),
        email: (schema, _check, message) => schema.regex(ctx.email, message),
      }),
    array: (node, { lib, field }) => lib.array(field(node.item), node.message),
    // …one function per kind
  },
  object: (entries, { lib }) => lib.object(Object.fromEntries(entries.map((entry) => [entry.key, entry.schema]))),
  nullable: (schema) => schema.nullable(),
  optional: (schema) => schema.optional(),
  refine: (schema, refinements, ctx) => schema.superRefine(/* … */),
  standard: (schema) => schema,
});

export const zodAdapter = zodSchemaBuilder.createAdapter({ library: 'zod', label: 'Zod' });
```

`packages`, `compile`, `emit` and `supports` can be passed to override the defaults. Adapters that
don't use a schema builder call `createValidatorAdapter(build)` with all options.

Validators must be synchronous Standard Schemas: multi-step form completeness is checked
synchronously. Every adapter in this repo runs the same conformance suite.

## Using the result

```ts
import { createFormFromDefinition, generateCode } from '@jfdevelops/multi-step-form-builder-core';

// Run a built form directly…
const form = createFormFromDefinition(definition, { registry })();

// …or export it as a TypeScript module to commit with full type inference.
const { files, packages } = generateCode(definition, { registry });
// files: [{ path: 'form.ts', source: '...' }, { path: 'steps/step1.ts', source: '...' }, ...]
```

Generated files include `form.ts` as the entry point and one `steps/step1.ts` module per step.
Each step module contains its validator imports, helper declarations, validator, and any fallback value types,
and `defineMultiStepForm.defineStep({ ... })` call. Step numbers are assigned only by the
entry point's `steps` map. Help text and choice options live in each field configuration.
`source` and `toSource` remain available for a standalone module, and `validatorsSource`
provides the validators alone.

When an adapter sets `supportsTypeInference: true`, defaults reference the validator's input
type through one inferred `Step1Values = ResolveValidatorInput<typeof step1Schema>` alias
and indexed field types instead of redeclaring the
schema's structure. Root `undefined` is excluded from supplied defaults; nullable values and
initial empty values for required fields are preserved. Zod, Valibot, ArkType, and Effect
support this. Built-in, Yup, Joi, and custom adapters without this capability retain explicit types.

## The store

`builder.subscribe(listener)` and `builder.getSnapshot()` follow the external store contract, so
any framework can subscribe (`useSyncExternalStore` in React).

| Commands | |
| --- | --- |
| `steps.add / update / remove / move / duplicate / setActive` | Steps |
| `fields.add / update / setProperty / updateSchema / remove / move / duplicate` | Fields |
| `validation.set`, `settings.update` | Step validation and form settings |
| `select(id, mode)` with `'replace'`, `'toggle'` or `'range'` | Selection |
| `history.undo / redo / transaction / clear` | Undo history. Rapid edits to one property merge. |
| `clipboard.copy / cut / paste` | Copy and paste fields |
| `canDrop / drop` | Apply drag and drop results from any DnD library |
| `load / loadFromStorage / save / toJSON` | Persistence with `createMemoryStorage`, `createLocalStorageAdapter`, or your own `BuilderStorage` |

`getPaletteModel`, `getCanvasModel`, `getInspectorModel`, `getStepValidationModel`,
`getFormSettingsModel` and `getSchemaEditorModel` turn a snapshot into plain view models.
`handleKeyDown(builder, event)` runs the default keyboard shortcuts.

## Editing an existing form

`fromStepsConfig(schema.stepSchema.original)` reads a hand-written form into a definition,
inferring each field's schema from its default value. `validateFields` and `isComplete` are kept
as code-owned validation, which the builder shows but doesn't edit. Pass `resolveCode` to
`compileDefinition` to reattach them.
