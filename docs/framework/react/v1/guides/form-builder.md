---
title: Build a form editor
description: Compose a headless React palette and canvas around a shared builder instance.
order: 10
---

The React builder supplies editor behavior, drag and drop, and accessibility
wiring. Compose its elements with your own styles and controls.

In this guide you will:

- Create a builder for a component's lifetime.
- Render a palette and editable canvas.
- Add inspection, preview, and code export.

## Render a palette and canvas

```tsx
import {
  Canvas,
  CanvasField,
  DragHandle,
  FormBuilder,
  Palette,
  PaletteItem,
  useFormBuilder,
} from '@jfdevelops/react-multi-step-form-builder';

export function WorkshopBuilder() {
  const builder = useFormBuilder();

  return (
    <FormBuilder builder={builder}>
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
or [validator adapters](../../../core/v1/guides/validators.md). Preview and
generation use the provider's builder registry.

## Next steps

- [Save builder definitions](../../../core/v1/guides/persistence.md)
- [Understand source generation](../../../core/v1/guides/definitions.md)
- [Explore the complete editor example](https://github.com/jfdevelops/multi-step-form/blob/3005838d05ef1ea26b616e0c4feec6a046ddc09b/examples/react-form-builder/README.md)
