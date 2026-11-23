---
title: Build a form editor
description: Compose a headless React palette and canvas around a shared builder instance.
order: 20
---

The React builder supplies editor behavior, drag and drop, and accessibility
wiring. Compose its elements with your own styles and controls.

In this guide you will:

- Create a builder for a component's lifetime.
- Render a palette and editable canvas.
- Add inspection, preview, and code export.

## Start with an editable design

Install the [builder packages](installation.md). For a useful initial canvas,
create `initial-definition.ts`:

```ts
import { createDefinitionBuilder } from '@jfdevelops/multi-step-form-builder-core';

export const initialDefinition = createDefinitionBuilder()
  .settings({ validator: 'builtin' })
  .step({ title: 'Contact' }, (step) => {
    step.field({ type: 'string.email', key: 'email', isRequired: true });
  })
  .build();
```

This design starts with an email field and schema-based completion. You can also
start empty, but preview will report an error until each step has a field.

## Render a palette and canvas

```tsx
import {
  AddStepButton,
  Canvas,
  CanvasField,
  DragHandle,
  FormBuilder,
  Palette,
  PaletteItem,
  StepList,
  StepTab,
  useFormBuilder,
} from '@jfdevelops/react-multi-step-form-builder';
import { initialDefinition } from './initial-definition';

export function WorkshopBuilder() {
  const builder = useFormBuilder({ initial: initialDefinition });

  return (
    <FormBuilder builder={builder}>
      <StepList>
        {({ steps }) => steps.map((step) => (
          <StepTab key={step.id} step={step}>{step.title}</StepTab>
        ))}
      </StepList>
      <AddStepButton>Add step</AddStepButton>
      <Palette>
        {({ items }) =>
          items.map((item) => (
            <PaletteItem key={item.id} item={item}>
              {item.label}
            </PaletteItem>
          ))
        }
      </Palette>
      <Canvas>
        {({ fields }) =>
          fields.map((field) => (
            <CanvasField key={field.id} field={field}>
              <DragHandle>Move field</DragHandle>
              {field.label ?? field.key}
            </CanvasField>
          ))
        }
      </Canvas>
    </FormBuilder>
  );
}
```

`useFormBuilder` keeps one builder for the component's lifetime. `FormBuilder`
provides it to descendants and sets up drag and drop. Palette items can be
activated by click, keyboard, or dragging. The canvas shows the active step.

Select a canvas field to inspect it. Add a second step with Add step, activate
it, and add another palette field. Returning to the first tab preserves its
definition. Reorder fields with their handles or the editor actions.

`useFormBuilder` reads its options on the first render and destroys its builder
when the owning component unmounts. Use commands to edit it or `builder.load`
to switch documents. Do not call `createFormBuilder` on every render.

## Add editor controls

| Task | Elements or hooks |
| --- | --- |
| Navigate and add steps | `StepList`, `StepTab`, `AddStepButton` |
| Edit selected field properties | `Inspector`, `InspectorProperty` |
| Edit a field's schema tree | `useSchemaEditor` |
| Choose step validation | `StepValidation`, `useStepValidation` |
| Configure form settings | `useFormSettings` |
| Undo, redo, copy, or paste | `ActionButton`, `useBuilderAction` |

For inspector controls, spread `labelProps` and `controlProps` onto their
elements to preserve accessible relationships. Convert the control's value to
the property type before calling `setValue`; for example, a checkbox should pass
its checked state rather than its string value.

Components accept native props and expose state through `data-*` attributes.
When composing a custom element through `render`, spread the supplied props so
event handlers, refs, and accessibility attributes reach the rendered element.

## Preview and export the result

Call `useFormPreview()` in a descendant of `FormBuilder` to run the designed form.
Check its `status` before rendering successful preview state and display the
error when compilation fails. Render controls suitable for each field's value
type rather than converting every field into a text input.

`useGeneratedCode()` returns generated modules, standalone source, validator
source, and imported package names. Check its `error` before presenting export
actions. Use `files` when exporting separate `form.ts` and step modules.

Pass a registry through `useFormBuilder({ registry })` to enable custom fields
or [validator adapters](validation.md). Preview and
generation use the provider's builder registry.

## Next steps

- [Add an inspector](inspector.md)
- [Add history and clipboard controls](selection-and-history.md)
- [Render live preview](preview.md)
- [Export the design](code-generation.md)
- [Save builder definitions](persistence.md)
