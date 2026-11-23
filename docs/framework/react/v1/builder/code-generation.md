---
title: Code generation and compilation
description: Choose runtime compilation or typed source export and understand the files and dependencies each form needs.
order: 120
---

Compile a definition when your application runs forms designed at runtime.
Generate source when developers need concrete field names and inferred types
in application code.

In this guide you will:

- Choose a consumption strategy.
- Generate organized TypeScript modules.
- Configure export names and package imports.
- Preserve application-owned validation logic.

## Choose compilation or generation

| Approach | Best fit | Result |
| --- | --- | --- |
| `createFormFromDefinition` | Run a saved form whose fields are known at runtime | Configured core runtime factory |
| `compileDefinition` | Integrate the compiled steps into your own definition setup | Definition options |
| `generateCode` | Put a designed form into a typed application codebase | TypeScript text and dependency names |

Compilation does not create a React layout or input components. Even when
generated source imports the React runtime, your application still creates the
components that render the resulting fields.

## Generate a registration form

```ts
import {
  createDefinitionBuilder,
  generateCode,
} from '@jfdevelops/multi-step-form-builder-core';

const definition = createDefinitionBuilder()
  .settings({ validator: 'builtin' })
  .step({ title: 'Contact' }, (step) => {
    step.field({ type: 'string.email', key: 'email', isRequired: true });
  })
  .build();

const generated = generateCode(definition, {
  importFrom: '@jfdevelops/react-multi-step-form',
  factoryName: 'createRegistrationForm',
  instanceName: 'registration',
});

for (const file of generated.files) {
  console.log(file.path, file.source);
}
```

The organized output contains `form.ts` and per-step modules under `steps/`.
Preserve their relative paths when writing or downloading them. `factoryName`
names the exported factory. `instanceName` names the exported instance for forms
without named instances; named-instance forms require the consumer to choose one.

## Choose the right output

| Property | Use it for |
| --- | --- |
| `files` | Multi-file application export |
| `source` | Standalone module or copy-to-clipboard action |
| `validatorsSource` | Validator-only output; empty without builder-managed validators |
| `packages` | Dependencies imported by the generated module |
| `steps` | Step metadata and emitted validator information |
| `types` | Generated value type information |

Generation returns strings. It does not install dependencies or write files.
Install the returned packages in the consuming application, then compile that
application against the generated modules. Keep generated definitions separate
from handwritten UI so a later export does not overwrite your controls.

## Run a saved definition directly

```ts
import { createFormFromDefinition } from '@jfdevelops/multi-step-form-builder-core';

const createRuntime = createFormFromDefinition(definition);
const runtime = createRuntime();
const email = runtime.stepSchema.value.step1.fields.email.defaultValue;
```

Fields are runtime-defined, so the returned value does not provide the same
concrete field inference as generated source. Narrow runtime values before
passing them to controls that require a string or number.

For custom registries, pass `{ registry }` to compilation and generation. For
named instances, call the returned factory with the intended instance name.

## Handle code-owned logic explicitly

`fromStepsConfig` can represent existing runtime fields as a definition, but
functions are not serializable. It records code-owned validation as
`validation: { kind: 'code', ref: ... }`.

When compiling, provide `resolveCode` to supply that step's `validateFields` or
`isComplete` logic from your application. Without a resolver, those steps compile
without that validation. Do not assume importing JSON reconstructs arbitrary
callbacks or that generated code can recover their implementation.

## Next steps

- [Understand definitions](definitions.md)
- [Choose validator adapters](validation.md)
- [Render generated runtime forms](../quick-start.md)
