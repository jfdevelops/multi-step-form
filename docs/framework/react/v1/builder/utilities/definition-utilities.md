---
title: Definition and registry utilities
description: Create stable editor identities, resolve field defaults and labels, and bridge authored steps to editable definitions.
order: 10
---

Definition helpers prepare documents and presentation metadata before rendering.
Use them for import tools, palette customization, or editor initialization.

In this guide you will:

- Create a document and safe answer keys.
- Resolve registry-provided defaults.
- Apply inherited label settings.
- Convert existing steps into an editable document.

## Create identities and keys

```ts
import {
  createEmptyDefinition, createId, toKey, uniqueKey, isValidKey, getStepKey,
} from '@jfdevelops/multi-step-form-builder-core';

const definition = createEmptyDefinition({ title: 'Registration', stepTitle: 'Contact' });
const newId = createId('field');
const base = toKey('Email address');
const key = uniqueKey(base, ['emailAddress']);
const valid = isValidKey(key);
const runtimeKey = getStepKey(0);
```

The generated answer key is `emailAddress2`, and index zero maps to `step1`.
Editor IDs are separate from answer keys. `createId` is a session-oriented ID
generator, not a database uniqueness or authorization guarantee. Supply the
builder's `idGenerator` if your application needs another identity strategy.

`createEmptyDefinition` starts with one empty step and revision zero, using
`DEFINITION_SCHEMA_VERSION`. Do not expect the initial document to preview until
it has fields. `createDefinitionBuilder` is the fluent authoring alternative.

## Resolve palette defaults

```ts
import { createRegistry, resolveSchema, resolveDefaultValue } from '@jfdevelops/multi-step-form-builder-core';

const registry = createRegistry();
const type = registry.requireFieldType('string.email');
const schema = resolveSchema(type);
const initialValue = resolveDefaultValue(type, schema);
```

`resolveSchema` evaluates a registered schema factory or copies its JSON tree.
`resolveDefaultValue` uses a registered default or the schema's empty value.
Do not independently guess a custom type's defaults in the palette.

`BUILTIN_FIELD_TYPES` exposes the standard registrations. `registry.getFieldType`
looks up a palette ID or input variant, while `getInputType` finds the specific
variant. `getValidator` looks up a validator adapter. `requireFieldType` throws a
`FormBuilderError` when the type is unavailable.

## Resolve presentation from a field

`resolveFieldCasing(field, step, settings)` follows field → step → form → default.
`resolveFieldLabel` applies an explicit label, suppression, or derived label with
requiredness. `getOptionValues(field.props)` extracts choice values for a choice
schema. Use these utilities when rendering a custom preview or property hint.

`getCasingOptions(sample, inherited)` produces casing choices with sample labels.
`prop` builds property descriptors and `section` groups them into inspector
sections; see [custom fields](../custom-fields.md) for a complete registration.

## Import a code-authored form

```ts
import { fromStepsConfig, getConfigureOptions, toSource } from '@jfdevelops/multi-step-form-builder-core';

const imported = fromStepsConfig({
  step1: { title: 'Contact', fields: { email: { defaultValue: '' } } },
});
const configure = getConfigureOptions(imported);
const source = toSource(imported);
```

`fromStepsConfig` infers value schemas from defaults and records code-owned
validation references instead of serializing functions. Resolve lazy steps before
importing their definitions. Empty or mixed arrays may need schema editing after
inference, because the first element cannot express every intended constraint.

`getConfigureOptions` projects runtime configuration from the definition.
`toSource` returns `generateCode(...).source`; use the full generator for separate
modules, dependency names, validators, and type metadata.

## Inspect definition issues

```ts
import { validateDefinition } from '@jfdevelops/multi-step-form-builder-core';

const issues = validateDefinition(imported, registry);
const blocking = issues.filter((issue) => issue.severity === 'error');
```

Issues identify a node, a code, a message, and sometimes a property or schema
path. They cover authoring problems such as empty steps, duplicate keys, missing
registry types, incompatible defaults, and dangling field references.
The running builder already exposes these issues in its snapshot.

`validateDefinition` expects a definition-shaped object. Validate the outer
structure of untrusted network data before treating it as `FormDefinition`;
the TypeScript type and this authoring-issue helper are not a complete input
security boundary.

## Next steps

- [Schema utilities](schema-values.md)
- [Code generation](../code-generation.md)
- [Registry extensions](../custom-fields.md)
