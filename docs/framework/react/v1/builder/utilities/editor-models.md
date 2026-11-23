---
title: Editor models and actions
description: Build custom editor surfaces from framework-independent models and connect schema edits to undoable commands.
order: 30
---

Editor models project a snapshot into palette, canvas, inspector, and settings
data. Use them for a custom interface or when you need more control than the
headless React components provide.

In this guide you will:

- Derive view models from a snapshot.
- Edit a schema with undoable actions.
- Set inspected properties and validation modes.
- Choose React hooks that subscribe to the same models.

## Build models from one snapshot

```ts
import {
  createFormBuilder, getCanvasModel, getInspectorModel, getPaletteModel,
  getFormSettingsModel, getStepValidationModel,
} from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder();
const fieldId = builder.fields.add({ type: 'object', key: 'address' });
builder.select(fieldId);

const snapshot = builder.getSnapshot();
const canvas = getCanvasModel(snapshot);
const inspector = getInspectorModel(snapshot);
const palette = getPaletteModel(snapshot.registry, 'email');
const settings = getFormSettingsModel(snapshot);
const validation = snapshot.activeStepId
  ? getStepValidationModel(snapshot, snapshot.activeStepId)
  : undefined;
```

These functions do not subscribe. Recompute models from the latest snapshot in
your framework's reactive subscription. A model from an earlier snapshot remains
an earlier view after a command updates the builder.

## Edit nested schemas with commands

```ts
import { createSchemaEditorActions, getSchemaEditorModel } from '@jfdevelops/multi-step-form-builder-core';

const actions = createSchemaEditorActions(builder, fieldId);
const property = actions.addProperty([], 'city', 'string');
actions.addCheck([property], 'minLength');
actions.updateCheck([property], 0, { check: 'minLength', value: 2 });
const schemaEditor = getSchemaEditorModel(builder.getSnapshot(), fieldId);
```

Each action becomes an undoable schema edit and fits the default to its new
shape. Other actions include `setKind`, `update`, `removeCheck`,
`renameProperty`, `removeProperty`, `addOption`, and `removeOption`.
`createCheck(name, node, siblingKeys)` supplies a starting check with suitable
default parameters for a property editor.

The schema model contains node roles, paths, children, issues, available checks,
and sibling field keys. Use its `availableChecks` instead of offering
`equalsField` on a nested node where it is unsupported.

## Write through the intended action

`setInspectorValue(builder, path, value)` writes to the current inspector target,
including multi-selected fields. `getPath(object, path)` reads a dot-path property
for an editor model; it is distinct from a runtime field-value resolver.
`setStepValidationMode(builder, stepId, mode, library)` handles inherit, none,
and schema modes without manually reconstructing validation objects.

`runAction`, `resolveShortcut`, and `handleKeyDown` connect selection actions to
keyboard controls; `DEFAULT_SHORTCUTS` supplies the standard map. The React
`canRunAction` helper derives action availability from a snapshot, and
`useBuilderAction` subscribes to that availability and supplies the command.

## Choose the React subscription

| Hook | Purpose |
| --- | --- |
| `useBuilder` | Current provider's builder, without a snapshot subscription |
| `useBuilderSnapshot` | Current provider's complete snapshot |
| `useFormBuilderSnapshot(builder)` | Explicit builder snapshot without requiring a provider |
| `useBuilderSelector` | Selected snapshot value with configurable equality |
| `usePalette`, `useCanvas`, `useInspector` | Corresponding derived models |
| `useStepValidation` | Active or explicit step's validation model |
| `useSchemaEditor` | Selected or explicit field's schema model and actions |
| `useFormSettings` | Settings model and update command |
| `useBuilderDrag` | Source, destination, and blocked-drop reason during dragging |

`PaletteSearch` connects a search input to palette filtering. `StepValidation`
provides a headless validation-control surface. Preserve provided control props
when rendering custom elements. `resolveDrop` translates drag entity data into
a core source/destination; it does not itself perform the drop.

## Next steps

- [Selection and history](../selection-and-history.md)
- [Drag and drop](../drag-and-drop.md)
- [Schema values](schema-values.md)
