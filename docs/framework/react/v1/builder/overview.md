---
title: Builder overview
description: Understand the definition editor, its headless React components, and the path from design to a running form.
order: 0
---

The builder lets people design multi-step forms in your application. It manages
editable definitions, selection, history, validation schemas, and export while
you supply the editor's layout and controls.

## Follow the authoring workflow

```text
Registry → palette → steps and fields → inspector and schemas
                              ↓
                       JSON definition
                        ↙           ↘
                  Live preview    TypeScript export
                        ↓               ↓
                   Test answers    Application runtime
```

The saved artifact is a JSON definition: ordered steps and fields, initial
values, schema descriptions, and form settings. It is not a visitor's answers
and does not contain React components or executable callbacks.

## Choose the package layer

| Package | Responsibility |
| --- | --- |
| `@jfdevelops/multi-step-form-builder-core` | Definition commands, registry, schemas, history, storage, compilation, and code generation |
| `@jfdevelops/react-multi-step-form-builder` | Provider, palette, canvas, inspector, drag and drop, reactive hooks, and preview |
| Validator adapters | Compile the schema tree into a chosen validator library and generated source |

Use core on its own for programmatic authoring or a custom interface. Add the
React package for a visual editor. The builder is optional for applications that
write their runtime definitions directly in code.

## Learn the editor's vocabulary

| Concept | Meaning |
| --- | --- |
| Registry | Available field types, input variants, inspector properties, and validators |
| Definition | Serializable form document with a stable ID and revision |
| Snapshot | Definition plus editor selection, active step, history, issues, and save status |
| Field ID | Stable editor identity used for commands and selection |
| Field key | Answer name inside a step, such as `email` |
| Input type | Presentation metadata, such as `string.email` |
| Schema | Value shape and validation checks, independent of the control rendering it |
| Preview | Temporary runtime instance used to test the current design |

Editor step IDs stay stable when reordered. Runtime step keys follow position:
the first becomes `step1`, the second `step2`. Store editor selection by ID rather
than by generated runtime key.

## Build in stages

| Stage | Read |
| --- | --- |
| Install only what you need | [Installation](installation.md) |
| Render a first editor | [Quick start](quick-start.md) |
| Understand the saved document | [Definitions](definitions.md) |
| Add, move, and edit content | [Steps and fields](steps-and-fields.md) |
| Design property controls | [Inspector](inspector.md) |
| Edit value shapes and checks | [Schemas](schemas.md) |
| Offer application-specific inputs | [Custom fields and registries](custom-fields.md) |
| Choose validation behavior | [Validation](validation.md) |
| Add undo, clipboard, and shortcuts | [Selection and history](selection-and-history.md) |
| Control drop rules | [Drag and drop](drag-and-drop.md) |
| Test the designed form | [Preview](preview.md) |
| Produce application source | [Code generation](code-generation.md) |
| Configure runtime defaults | [Form settings](settings.md) |
| Save drafts and revisions | [Persistence](persistence.md) |
| Diagnose a broken definition | [Troubleshooting](troubleshooting.md) |
| Build custom tooling and validator adapters | [Builder utilities](utilities/overview.md) |

## Next steps

- [Install builder packages](installation.md)
- [Create the editor](quick-start.md)
- [Understand the runtime](../overview.md)
