# react-form-builder

A small but complete form builder made with
[`@jfdevelops/react-multi-step-form-builder`](../../packages/builder-react/README.md). It starts
with a sample workshop proposal with organizer details, session format, nested equipment requests, and scheduling.

- **Fields:** click a field type, or drag it onto the canvas or a step tab. Drag fields by their
  handle to reorder them.
- **Inspector:** select a field (or nothing, for the step). The input type decides how a field
  renders (a text field can be email, URL, passwordâ€¦). Labels come from the key and the label
  casing, like a hand-written multi-step form.
- **Value type & rules:** a schema builder for the selected field. Nest objects, lists,
  dictionaries and unions, and add checks to any value. The default value editor follows the type.
- **Validation:** pick a Standard Schema library for the whole form in the toolbar (Zod, Valibot,
  ArkType, Effect, Yup or Joi), or per step in the step inspector.
- **Instances:** use **Add instance** in the toolbar to create named instances, then rename or remove them. They share the form definition with independent runtime state. Names are included in generated code.
- **Preview:** the form running as a real multi-step form, with each step's validator deciding when
  it's complete.
- **Generated code / Standard Schema:** file tabs for `form.ts` and each step. Each step file
  contains its value types, validator, and `defineMultiStepForm.defineStep({ ... })`
  definition. Standard Schema shows the validated step files. Monaco resolves imports with the
  real packages' types; hover anything to see what TypeScript infers.
- **Definition (JSON):** what the builder stores.

The sample is a module-level `sampleDefinition` in `src/registry.ts`, constructed with the
fluent `createDefinitionBuilder().settings().step(...).build()` API. Step callbacks chain
`.field({ type, key, ... })` calls without managing step IDs.

All of the UI is in [`src`](src). The builder components are headless, so the styling is plain CSS
keyed off their `data-*` attributes.

```bash
pnpm build:builder   # from the repo root, once
pnpm --filter react-form-builder dev
pnpm --filter react-form-builder test
```

## Types in the code editor

[`editor-types.ts`](editor-types.ts) is a small Vite plugin that serves the type declarations of the
packages generated code can import (and their dependencies) as lazily loaded modules. The editor
loads a library's types when the generated code first imports it.
[`test/generated-code.test.ts`](test/generated-code.test.ts) typechecks the generated module with
every library against exactly those types.
