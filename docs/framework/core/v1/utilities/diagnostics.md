---
title: Errors, logging, and invariants
description: Handle structured runtime errors, enable targeted logs, and assert integration assumptions.
order: 70
---

Use diagnostics to explain an invalid configuration or operation at its source.
Runtime contract errors are distinct from a visitor entering an invalid email.

In this guide you will:

- Catch structured library errors.
- Choose the error family to investigate.
- Enable targeted logging.
- Assert assumptions with lazy messages.

## Inspect a library error

```ts
import { MultiStepFormError } from '@jfdevelops/multi-step-form-core';

export function describeFormFailure(error: unknown) {
  if (error instanceof MultiStepFormError) {
    return { code: error.code, message: error.message, context: error.context };
  }

  return { message: error instanceof Error ? error.message : 'Unknown failure' };
}
```

Library errors carry `code`, `scope`, and `context` alongside their message.
`renderMessage` can render the error's structured data with another formatter;
`toJSON` produces diagnostic data suitable for serialization. Include only
appropriate context in application logging because answers may be present.

## Find the relevant error family

| Area | Error exports |
| --- | --- |
| Instance dispatch | `InvalidInstanceError`, `NoActiveInstanceError` |
| Selection and reads | `InvalidKeyError`, `InvalidContextError`, `InvalidStepError`, `InvalidFieldError` |
| Configuration | `InvalidFieldConfigError`, `InvalidStepConfigError`, `InvalidFormConfigError` |
| Operations | `InvalidHelperInputError`, `InvalidUpdateError`, `UpdateMismatchError` |
| Rendering and conversion | `InvalidComponentError`, `InvalidTransformationError` |
| Environment and runtime integrity | `InvalidStorageError`, `InvalidInternalStateError` |

The matching exported context types describe each error's diagnostic payload.
Catch a specific class when recovery differs, such as selecting an allowed
instance, rather than matching text in `error.message`.

`createMultiStepFormError` is the builder for the library's structured error
classes. Use it when extending tooling with the same code/scope/context pattern;
ordinary application validation usually needs domain messages, not a new runtime
contract error class.

## Enable logs explicitly

```ts
import { MultiStepFormLogger } from '@jfdevelops/multi-step-form-core';

const logger = new MultiStepFormLogger({
  debug: true,
  prefix: 'Registration',
  includeTimestamp: true,
});

logger.info('Resolving contact defaults');
logger.warn('No saved draft was found');
```

Without `debug: true`, logger methods do not log. `DEFAULT_LOGGER_PREFIX`
provides the default label. Per-call options can replace, append, or prepend
prefixes and control timestamps. `error` logs an error; `throwOnError` or a
per-call `throw` option can also throw when logging is enabled. Do not use a
debug logger as your only correctness assertion.

## Assert an integration assumption

```ts
import { invariant, createInvariant, type Invariant } from '@jfdevelops/multi-step-form-core';

const assertRegistration: Invariant = createInvariant('Registration');
const stepNames = ['step1', 'step2'];
invariant(stepNames.length > 0, 'At least one step is required');
assertRegistration(stepNames.includes('step1'), (formatter) =>
  `Expected contact among ${formatter.format(stepNames)}`,
);
```

The message callback runs only when the condition fails and receives an
`Intl.ListFormat`. You can supply another error constructor as the third
argument. Annotate a named assertion callable with `Invariant` when TypeScript
requires an explicit assertion-function type.

## Next steps

- [Troubleshoot React integrations](../../../react/v1/troubleshooting.md)
- [Understand update scopes](action-factories.md)
- [Builder validation issues](../../../react/v1/builder/troubleshooting.md)
