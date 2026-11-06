# `@jfdevelops/react-multi-step-form-builder`

Headless React elements for building a drag-and-drop form builder on top of
[`@jfdevelops/multi-step-form-builder-core`](../builder-core/README.md). They provide behavior,
keyboard support, ARIA wiring and drag and drop (through [dnd-kit](https://dndkit.com)), with no
styles.

## Installation

```bash
pnpm add @jfdevelops/multi-step-form-builder-core @jfdevelops/react-multi-step-form-builder
```

## Usage

```tsx
import {
  Canvas,
  CanvasField,
  DragHandle,
  FormBuilder,
  Inspector,
  InspectorProperty,
  Palette,
  PaletteItem,
  StepList,
  StepTab,
  useFormBuilder,
} from '@jfdevelops/react-multi-step-form-builder';

export function Builder() {
  const builder = useFormBuilder();

  return (
    <FormBuilder builder={builder}>
      <Palette className="palette">
        {({ items }) =>
          items.map((item) => (
            <PaletteItem key={item.type} item={item}>
              {item.label}
            </PaletteItem>
          ))
        }
      </Palette>

      <StepList>
        {({ steps }) =>
          steps.map((step) => (
            <StepTab key={step.id} step={step}>
              {step.title}
            </StepTab>
          ))
        }
      </StepList>

      <Canvas className="canvas">
        {({ fields }) =>
          fields.map((field) => (
            <CanvasField key={field.id} field={field} className="field">
              <DragHandle>⠿</DragHandle>
              {field.field.label || field.key}
            </CanvasField>
          ))
        }
      </Canvas>

      <Inspector>
        {({ sections }) =>
          sections.map((section) =>
            section.properties.map((property) => (
              <InspectorProperty key={property.descriptor.path} property={property}>
                {({ labelProps, controlProps, value, setValue }) => (
                  <>
                    <label {...labelProps}>{property.descriptor.label}</label>
                    <input
                      {...controlProps}
                      value={String(value ?? '')}
                      onChange={(event) => setValue(event.target.value)}
                    />
                  </>
                )}
              </InspectorProperty>
            )),
          )
        }
      </Inspector>
    </FormBuilder>
  );
}
```

## Elements

Every element renders a sensible default tag and accepts that tag's props. It exposes its state
through `data-*` attributes (`data-selected`, `data-dragging`, `data-drop-target`,
`data-invalid`, …) and accepts `children` as a function of its state. To render your own element,
pass `render={(props, state) => …}` and spread `props` onto it.

| Element | Renders | Purpose |
| --- | --- | --- |
| `FormBuilder` | – | Provides the builder and sets up drag and drop |
| `Palette`, `PaletteSearch`, `PaletteItem` | `div`, `input`, `div` | Field types to click, press Enter on, or drag |
| `StepList`, `StepTab`, `AddStepButton` | `div`, `button`, `button` | Step tabs, which are also drop targets |
| `Canvas`, `CanvasField`, `DragHandle` | `div`, `div`, `button` | The active step's fields: selection, shortcuts, sorting |
| `Inspector`, `InspectorProperty` | `div`, `div` | Properties for the selection, with label, input and error ids |
| `StepValidation` | `div` | No validation, required-only, or a Standard Schema library per step |
| `ActionButton` | `button` | Undo, redo, delete, duplicate, copy, cut, paste… |

Hooks: `useFormBuilder`, `useBuilder`, `useBuilderSnapshot`, `useBuilderSelector`, `usePalette`,
`useCanvas`, `useInspector`, `useStepValidation`, `useBuilderAction`, `useBuilderDrag`.
