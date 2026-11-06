# `@jfdevelops/multi-step-form-builder-core`

The framework-agnostic engine for building a drag-and-drop multi-step form builder. It owns the
form being edited, the commands a builder UI calls, undo/redo, selection, clipboard, drop rules,
step validation, and conversion to and from `defineMultiStepForm`. It has no DOM or framework
dependency: pair it with [`@jfdevelops/react-multi-step-form-builder`](../builder-react/README.md)
or your own bindings.

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
const emailId = builder.fields.add('string.email', undefined, { isRequired: true });
builder.fields.update(emailId, { placeholder: 'you@example.com' });

builder.history.undo();
const definition = builder.toJSON();
```

Steps aren't given keys. A multi-step form names steps by position (`step1`, `step2`, …) and uses
that number for progress and navigation, so a step compiles to `getStepKey(index)` and is
renumbered when it moves. Steps keep a stable `id` inside the builder. Field keys come from labels
(`"First name"` → `firstName`) and stay unique within a step.

## The store

`builder.subscribe(listener)` and `builder.getSnapshot()` follow the external store contract, so
any framework can subscribe (`useSyncExternalStore` in React). The snapshot holds the definition,
active step, selection, definition issues, history and save status.

| Commands | |
| --- | --- |
| `steps.add / update / remove / move / duplicate / setActive` | Steps |
| `fields.add / update / setProperty / remove / move / duplicate` | Fields. Renaming a key rewrites validation references. |
| `validation.set / useLibrary / setFieldRules / getFieldRules` | Step validation |
| `select(id, mode)` with `'replace'`, `'toggle'` or `'range'` | Selection |
| `history.undo / redo / transaction / clear` | Undo history. Rapid edits to one property merge. |
| `clipboard.copy / cut / paste` | Copy and paste fields |
| `canDrop / drop` | Apply drag and drop results from any DnD library |
| `load / loadFromStorage / save / toJSON` | Persistence with `createMemoryStorage`, `createLocalStorageAdapter`, or your own `BuilderStorage` |

`handleKeyDown(builder, event)` runs the default shortcuts: undo/redo, delete, duplicate,
copy/cut/paste, Alt+↑/↓ to reorder and ↑/↓ to move the selection. Override them with a
`ShortcutMap`.

## Field types

The registry defines what authors can add. Built-in types use the same names as hand-written
field `type` metadata (`string`, `string.email`, `boolean.switch`, `date`, `string.select`, …).
Each type describes its palette entry, defaults, inspector sections and inferred validation rules:

```ts
import { createRegistry, prop, section } from '@jfdevelops/multi-step-form-builder-core';

const registry = createRegistry().withFieldType({
  type: 'number.rating',
  label: 'Rating',
  category: 'Choice',
  defaultValue: 3,
  inspector: [section('Rating', [prop.number('props.max', { label: 'Stars', min: 1 })])],
  inferChecks: () => [{ check: 'min', value: 1 }],
});
```

`getPaletteModel`, `getCanvasModel`, `getInspectorModel` and `getStepValidationModel` turn a
snapshot into plain view models for any UI layer.

## Step validation

Each step can have no validation, required-only validation, or rules compiled by a Standard
Schema library the author picks for that step. Completeness follows validation, so the builder
never needs `isComplete`.

```ts
builder.validation.useLibrary(stepId, 'builtin');
builder.validation.setFieldRules(stepId, 'password', {
  type: 'string',
  checks: [{ check: 'minLength', value: 8 }],
});
```

`builtin` has no dependencies. Other libraries ship as separate packages, so an app only installs
the one it uses, e.g. [`@jfdevelops/multi-step-form-builder-zod`](../builder-zod/README.md). To
support another library, implement `ValidatorAdapter`.

## Using the result

```ts
import { compileDefinition, toSource } from '@jfdevelops/multi-step-form-builder-core';
import { defineMultiStepForm } from '@jfdevelops/react-multi-step-form';

// Run a built form directly…
const form = defineMultiStepForm(compileDefinition(definition, { registry })).configure()();

// …or export it as source code to commit with full type inference.
const code = toSource(definition, { registry });
```

## Editing an existing form

`fromStepsConfig(schema.stepSchema.original)` reads a hand-written form into a definition. Plain
data becomes editable. `validateFields` and `isComplete` are kept as code-owned validation, which
the builder shows but doesn't edit. Pass `resolveCode` to `compileDefinition` to reattach them.
