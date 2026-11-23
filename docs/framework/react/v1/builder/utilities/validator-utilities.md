---
title: Validator resolution and checks
description: Resolve requiredness and cross-field refinements, compile a single step, and reuse shared check helpers.
order: 40
---

Validator utilities bridge editable field schemas and the actual rules applied
to answers. Use them for custom preview tools and adapter development.

In this guide you will:

- Resolve a step's effective validation.
- Compile or emit validation for one step.
- Distinguish requiredness from shape matching.
- Reuse shared messages and pattern checks.

## Resolve the effective rules

```ts
import {
  createDefinitionBuilder, createRegistry, resolveStepLibrary,
  resolveFieldSchema, resolveStepSchema, compileStepValidator, buildStepValidator,
} from '@jfdevelops/multi-step-form-builder-core';

const definition = createDefinitionBuilder()
  .settings({ validator: 'builtin' })
  .step({ title: 'Contact' }, (step) => {
    step.field({ type: 'string.email', key: 'email', isRequired: true });
  })
  .build();

const step = definition.steps[0]!;
const registry = createRegistry();
const library = resolveStepLibrary(step, definition.settings);
const fieldRules = resolveFieldSchema(step.fields[0]!);
const spec = resolveStepSchema(step, definition.settings);
const validator = compileStepValidator(step, registry, definition.settings);
const emitted = buildStepValidator(step, registry, definition.settings);
```

`resolveFieldSchema` applies requiredness and moves root `equalsField` checks
into step-level refinements. Required strings and arrays gain a nonempty rule;
optional fields accept their supported “nothing entered” representation.
`resolveStepSchema` combines fields and refinements without choosing a validator
implementation.

`resolveStepLibrary` follows explicit step library, form library, and the
built-in fallback for an explicit schema-mode step. An unconfigured step has no
validation unless the form selects a default. `none` and `code` do not produce
builder-managed validation.

## Compile or emit the same specification

`compileStepValidator` returns a synchronous Standard Schema validator, or
`undefined` without builder-managed validation. `buildStepValidator` also
returns emitted imports, declarations, code, selected library, and type-inference
capability. Missing selected adapters throw `FormBuilderError`.

The built-in `createSchemaValidator(spec)` creates a synchronous validator
directly from a resolved specification. `builtinAdapter` wraps it for registry
compilation and source generation. Call the Standard Schema `~standard.validate`
method with raw step values, not field metadata.

Shape matching with `matchesSchema` does not run these checks. Use the compiled
validator when checking answers against rules such as a minimum count or email
format.

## Reuse check helpers

```ts
import {
  compilePattern, defaultCheckMessage, isEmptyValue, isUrl,
} from '@jfdevelops/multi-step-form-builder-core';

const pattern = compilePattern({ check: 'pattern', value: '^[A-Z]{3}$' });
const message = defaultCheckMessage({ check: 'minLength', value: 2 }, { kind: 'string' });
const absent = isEmptyValue([]);
const validUrl = isUrl('https://example.com');
```

`compilePattern` returns a regular expression or a reason string, so narrow its
result before calling `.test`. `MAX_PATTERN_LENGTH` limits author-provided
pattern length. `PATTERNS` supplies the shared email and UUID patterns.

`isEmptyValue` recognizes `undefined`, `null`, `''`, and `[]`; it does not treat
`false` or zero as absent. `allowsEmptyString(node)` supports the optional-value
policy for string-like shapes. `isUrl` checks whether a string can construct a
URL; it is not an application allowlist of URL protocols or hosts.

`defaultCheckMessage` supplies fallback copy; a check's explicit `message`
takes precedence when building a validator. Keep custom control messages aligned
with the checks actually compiled by the selected adapter.

## Next steps

- [Create a validator adapter](adapter-development.md)
- [Schema shape helpers](schema-values.md)
- [Validation modes](../validation.md)
