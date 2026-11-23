---
title: Drag and drop
description: Connect palette and canvas behavior, constrain drops, and preserve keyboard alternatives.
order: 100
---

The React provider connects palette items and canvas fields to drag and drop.
Use core drop rules to enforce editor constraints consistently across surfaces.

In this guide you will:

- Distinguish palette insertion from moving fields.
- Block a drop with an explanation.
- Observe successful drops.
- Keep a non-drag editing path available.

## Understand sources and destinations

| Value | Meaning |
| --- | --- |
| `{ kind: 'palette', fieldType: 'text' }` | Add a new field of this type |
| `{ kind: 'field', fieldId }` | Move an existing field |
| `{ stepId, index }` | Destination position after moved fields are removed |

`FormBuilder` sets up drag and drop around its descendants. `PaletteItem`,
`CanvasField`, and `DragHandle` provide the corresponding behaviors. Keep them
inside the same provider so insertion, selection, and movement share one builder.

## Limit the number of fields

```ts
import { createFormBuilder } from '@jfdevelops/multi-step-form-builder-core';

const builder = createFormBuilder({
  canDrop: ({ source, target, definition }) => {
    const step = definition.steps.find((candidate) => candidate.id === target.stepId);

    if (source.kind === 'palette' && step && step.fields.length >= 12) {
      return 'This step already has twelve fields.';
    }

    return true;
  },
});
```

`canDrop` returns `true` or an explanatory string. This example limits new palette
insertions. Extend the rule if moving a field from another step should be limited
too. Do not confuse a drop rule with server validation of a saved definition.

## Apply a drop in a custom interface

```ts
const stepId = builder.getSnapshot().activeStepId;

if (stepId) {
  const source = { kind: 'palette', fieldType: 'text' } as const;
  const target = { stepId, index: 0 };
  const allowed = builder.canDrop(source, target);

  if (allowed === true) {
    builder.drop(source, target);
  } else {
    console.log(allowed);
  }
}
```

The React provider applies accepted drops itself. Its `onDrop` callback receives
the affected field IDs and source/destination after a successful change; use it
for follow-up UI such as focusing the inserted field, not to apply the drop again.

Pass sensor or plugin configuration through the provider's `dragDrop` prop when
the default interaction needs adjustment. Preserve supplied handlers and refs
when rendering custom elements through headless component APIs.

## Offer equivalent editing controls

Authors should be able to add palette items by activation and move fields with
buttons or keyboard actions. Show why a blocked move is unavailable. A drag
handle's visual appearance alone does not explain its purpose; retain its
accessible label and focus behavior.

## Next steps

- [Build the palette and canvas](quick-start.md)
- [Add keyboard and history controls](selection-and-history.md)
- [Edit steps and fields](steps-and-fields.md)
