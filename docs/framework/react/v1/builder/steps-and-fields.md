---
title: Steps and fields
description: Create and reorder form content with stable editor IDs and deliberate field keys.
order: 40
---

Builder commands edit the form definition and update history, issues, and
subscribers together. Use commands instead of mutating the snapshot.

In this guide you will:

- Create a form with several steps.
- Edit metadata and defaults.
- Move and duplicate content.
- Separate stable IDs from answer keys.

## Create the content

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder();
const contactId = builder.getSnapshot().activeStepId;

if (contactId) {
  builder.steps.update(contactId, { title: 'Contact details' });
  builder.fields.add({ type: 'string.email', key: 'email', stepId: contactId });
}

const preferencesId = builder.steps.add({ title: 'Preferences' });
const remindersId = builder.fields.add({
  type: 'boolean',
  key: 'reminders',
  stepId: preferencesId,
  defaultValue: false,
});
```

An empty builder starts with one step. Add fields to it before previewing: a step
with no fields is a definition error. `fields.add` accepts a palette ID or an
input variant and returns the new field's editor ID.

Pass `stepId` when the destination must be explicit. Without it, insertion uses
the active step. `steps.setActive(id)` changes which step the canvas displays.

## Edit properties and defaults

```ts
builder.fields.update(remindersId, {
  label: 'Send me reminders',
  description: 'Receive a reminder before the event.',
});
builder.fields.setProperty(remindersId, 'defaultValue', true);
```

Defaults are values the eventual runtime starts with. Editing a default is not
the same as entering an answer in preview. Property paths such as `props.options`
address the definition; runtime update paths such as `fields.email.defaultValue`
belong to a different API.

Switching input variants within a field type adjusts variant checks, such as
email validation. Switching to another field type resets the schema. Inspect
the resulting default and schema after changing a field's kind.

## Move and duplicate content

```ts
builder.steps.move(preferencesId, 0);
const copiedIds = builder.fields.duplicate(remindersId);
builder.fields.move(copiedIds, { stepId: preferencesId, index: 0 });
builder.fields.remove(copiedIds);
```

Move indexes describe the destination after moved fields are taken out. Use
`steps.duplicate` for a whole step and `fields.duplicate` for fields. Copies need
their own IDs and keys; do not implement copying by reusing another node's ID.

## Keep identity and answer names separate

| Value | Use it for |
| --- | --- |
| `field.id` | Selection, inspector edits, move and delete commands |
| `field.key` | The answer property in generated/runtime step values |
| `step.id` | Active editor step and step commands |
| Runtime `step1` | Position-based runtime lookup after compilation |

Field keys must be valid JavaScript identifiers and unique within their step.
`emailAddress` is valid; `email address` is not. Renaming an answer key can also
invalidate `equalsField` checks that refer to it; review definition issues after
renaming or removing related fields.

## Next steps

- [Edit schemas](schemas.md)
- [Build inspector controls](inspector.md)
- [Group operations into history](selection-and-history.md)
