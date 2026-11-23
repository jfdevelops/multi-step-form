---
title: Inspector and property controls
description: Render selection-aware property panels with typed input behavior and accessible labels and messages.
order: 50
---

The inspector turns the current editor selection into editable property models.
Use it to change labels, requiredness, defaults, input variants, and custom
properties without coupling your panel to the definition's internal structure.

In this guide you will:

- Render sections for the selected node.
- Connect text and switch controls.
- Preserve accessibility props and mixed-value feedback.
- Extend the panel to other property types.

## Render selected properties

Render this component inside the `FormBuilder` from the [quick start](quick-start.md):

```tsx
import { Inspector, InspectorProperty } from '@jfdevelops/react-multi-step-form-builder';

export function PropertyPanel() {
  return (
    <Inspector>
      {({ sections }) => sections.map((section) => (
        <fieldset key={section.id}>
          <legend>{section.title}</legend>
          {section.properties.map((property) => (
            <InspectorProperty key={property.descriptor.path} property={property}>
              {({ descriptor, value, mixed, hint, error, setValue,
                labelProps, controlProps, descriptionProps, errorProps }) => (
                <div>
                  <label {...labelProps}>{descriptor.label}</label>
                  {descriptor.control === 'switch' ? (
                    <input {...controlProps} type='checkbox' checked={value === true}
                      onChange={(event) => setValue(event.target.checked)} />
                  ) : descriptor.control === 'text' || descriptor.control === 'key' ? (
                    <input {...controlProps} value={typeof value === 'string' ? value : ''}
                      placeholder={mixed ? 'Multiple values' : hint}
                      onChange={(event) => setValue(event.target.value)} />
                  ) : <p>Add a {descriptor.control} property control.</p>}
                  {mixed && <p>Selected fields have different values.</p>}
                  {descriptor.description && <p {...descriptionProps}>{descriptor.description}</p>}
                  {error && <p {...errorProps}>{error}</p>}
                </div>
              )}
            </InspectorProperty>
          ))}
        </fieldset>
      ))}
    </Inspector>
  );
}
```

This implements text, key, and switch properties. It deliberately identifies
other control kinds so an unsupported value is not silently converted to text.
Add your own renderers for those kinds before treating this as a complete panel.

`labelProps` and `controlProps` connect the generated IDs. Descriptions and
errors use their corresponding props to preserve ARIA relationships.
`setValue` edits the inspected nodes through one undoable command.

## Understand what is selected

With no field selected, the inspector targets the active step. With one selected
field it shows that field's properties. With several fields, it exposes common
properties and marks differing values as `mixed`.

An empty string is not equivalent to a mixed selection. Show a mixed indicator
until the author chooses a replacement. Switch controls can also display an
indeterminate state through your control implementation.

## Extend the control renderer

| Kind | Input behavior |
| --- | --- |
| `textarea` | String value with multiline editing |
| `number` | Numeric conversion with deliberate empty handling |
| `select`, `casing` | Choices from the descriptor or casing model |
| `options` | Editable option labels and values |
| `value` | Editor driven by the field's schema |
| `json` | Structured JSON editing and parse feedback |
| Custom string | Application-specific property control |

Use `hint` to explain inherited labels or casing. Clearing an explicit property
and restoring inheritance may require writing `undefined`; writing `''` is an
explicit empty string instead.

## Separate schemas from presentation

Changing a label or placeholder does not change a field's value schema.
`useSchemaEditor` exposes shape and check editing separately. Without a field
ID it requires exactly one selected field; show selection guidance when it
returns `undefined`.

Custom field registrations can append inspector sections. Keep property controls
generic enough to use their descriptors while reserving domain-specific controls
for custom kinds your application knows how to render.

## Next steps

- [Edit schemas and defaults](schemas.md)
- [Register custom properties](custom-fields.md)
- [Understand selection](selection-and-history.md)
