---
title: Live preview
description: Test designed forms with typed controls, completion feedback, and temporary answers.
order: 110
---

Live preview compiles the current design into a running form. It lets authors
test defaults and validation before exporting without saving test answers as
part of the definition.

In this guide you will:

- Handle preview compilation errors.
- Bind preview controls to the right value type.
- Navigate with completion feedback.
- Understand which answers survive design edits.

## Check readiness before rendering

Use `useFormPreview` inside `FormBuilder`. It returns either `status: 'error'`
with an error or `status: 'ready'` with steps, fields, and navigation operations.
An empty step can make a definition unrunnable even while it is a valid
intermediate editing state.

## Render a string-field preview

```tsx
import { useFormPreview } from '@jfdevelops/react-multi-step-form-builder';

export function TextFormPreview() {
  const preview = useFormPreview();

  if (preview.status === 'error') {
    return <p role='alert'>{preview.error.message}</p>;
  }

  const step = preview.currentStep;

  return (
    <section aria-label='Form preview'>
      <h2>{step.title}</h2>
      {step.fields.map((field) => (
        <div key={field.definition.id}>
          {typeof field.value === 'string' ? (
            <label>
              {field.label}
              <input value={field.value} onChange={(event) => field.setValue(event.target.value)} />
            </label>
          ) : <p>This preview needs a control for {field.definition.type}.</p>}
          {step.attempted && field.errors.map((message, index) => (
            <p role='alert' key={index}>{message}</p>
          ))}
        </div>
      ))}
      <button type='button' disabled={preview.isFirst} onClick={() => preview.previous()}>Back</button>
      <button type='button' disabled={preview.isLast} onClick={() => preview.next()}>Next</button>
      <button type='button' onClick={() => preview.reset()}>Reset preview</button>
    </section>
  );
}
```

This example deliberately renders only strings. Extend it with checkboxes for
booleans, numeric controls for numbers, and structured editors for objects and
arrays. `field.setValue` accepts JSON values; date preview values use serialized
strings. Choose control presentation from `field.definition.type` and its schema.

## Test navigation and errors

`next()` advances only when the current step is complete and reports whether it
moved. An incomplete attempt marks the step `attempted`, allowing the UI to show
its field errors. `previous()` returns to earlier answers; `goTo(index)` supports
author navigation by index. This authoring preview is not your application's
production routing policy.

At the last step, show the author a completion indicator or summary. Preview
does not submit to your production endpoint. Production submission belongs to
the application consuming the definition or generated source.

## Understand preview lifetime

Preview ignores configured runtime storage and named instances. It keeps test
answers in its temporary runtime. After design edits, compatible entered values
can survive for steps with the same ID and fields with the same key. Values still
equal to the previous default give way to newly edited defaults.

Changing a field's shape or key can discard an incompatible answer. Reset
rebuilds preview defaults, returns to the first step, and clears attempted state.
Preview answers are never the draft saved by `builder.save()`.

## Next steps

- [Configure validation](validation.md)
- [Export the tested design](code-generation.md)
- [Save definitions](persistence.md)
